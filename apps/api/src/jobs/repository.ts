import { randomUUID } from 'node:crypto';
import { and, eq, or, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { backgroundJobs } from '../db/schema.js';
import type { Transaction } from '../services/idempotency.service.js';
const JobSchema = z.object({
    type: z.literal('maintenance.prune-idempotency'), eventKey: z.string().min(1).max(255), payload: z.object({}).strict(), runAt: z.date()
});
export type JobInput = z.infer<typeof JobSchema>;
export type Job = typeof backgroundJobs.$inferSelect;
export async function enqueueJob(tx: Transaction, input: JobInput): Promise<string> {
    const value = JobSchema.parse(input);
    const [created] = await tx.insert(backgroundJobs).values(value).onConflictDoNothing({
        target: backgroundJobs.eventKey
    }).returning({
        id: backgroundJobs.id
    });
    if (created)
        return created.id;
    const [existing] = await tx.select().from(backgroundJobs).where(eq(backgroundJobs.eventKey, value.eventKey));
    if (existing.type !== value.type || JSON.stringify(existing.payload) !== JSON.stringify(value.payload))
        throw new Error('JOB_EVENT_KEY_REUSED');
    return existing.id;
}
export async function claimJob(): Promise<Job | null> {
    return db.transaction(async (tx) => {
        await tx.update(backgroundJobs).set({
            status: 'failed', claimToken: null, lockedUntil: null, lastError: 'JOB_LEASE_EXHAUSTED'
        }).where(and(eq(backgroundJobs.status, 'running'), lte(backgroundJobs.lockedUntil, sql `now()`), sql `${backgroundJobs.attempts} >= 10`));
        const [next] = await tx.select().from(backgroundJobs).where(or(and(eq(backgroundJobs.status, 'pending'), lte(backgroundJobs.runAt, sql `now()`)), and(eq(backgroundJobs.status, 'running'), lte(backgroundJobs.lockedUntil, sql `now()`)))).orderBy(backgroundJobs.runAt, backgroundJobs.createdAt).limit(1).for('update', {
            skipLocked: true
        });
        if (!next)
            return null;
        const [job] = await tx.update(backgroundJobs).set({
            status: 'running', attempts: next.attempts + 1, claimToken: randomUUID(), lockedUntil: sql `now() + interval '2 minutes'`, updatedAt: sql `now()`
        }).where(eq(backgroundJobs.id, next.id)).returning();
        return job;
    });
}
export async function settleJob(job: Job, error = false): Promise<boolean> {
    const [changed] = await db.update(backgroundJobs).set({
        status: error ? (job.attempts >= 10 ? 'failed' : 'pending') : 'completed', runAt: error ? new Date(Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(job.attempts - 1, 10))) : job.runAt, lastError: error ? 'JOB_EXECUTION_FAILED' : null, lockedUntil: null, claimToken: null, updatedAt: sql `now()`
    }).where(and(eq(backgroundJobs.id, job.id), eq(backgroundJobs.status, 'running'), eq(backgroundJobs.claimToken, job.claimToken!), sql `${backgroundJobs.lockedUntil} > now()`)).returning({
        id: backgroundJobs.id
    });
    return Boolean(changed);
}
export async function renewJob(job: Job): Promise<boolean> {
    const [changed] = await db.update(backgroundJobs).set({
        lockedUntil: sql `now() + interval '2 minutes'`
    }).where(and(eq(backgroundJobs.id, job.id), eq(backgroundJobs.claimToken, job.claimToken!), eq(backgroundJobs.status, 'running'), sql `${backgroundJobs.lockedUntil} > now()`)).returning({
        id: backgroundJobs.id
    });
    return Boolean(changed);
}
