import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { enqueueJob, claimJob, settleJob, renewJob, type Job } from './repository.js';
export async function executeJob(job: Job): Promise<void> {
    if (job.type !== 'maintenance.prune-idempotency')
        throw new Error('INVALID_JOB_PAYLOAD');
    z.object({}).strict().parse(job.payload);
    // Keep delete batches bounded. Repeated execution after a worker crash is harmless.
    await db.execute(sql `DELETE FROM idempotency_records WHERE id IN (SELECT id FROM idempotency_records WHERE expires_at <= now() ORDER BY expires_at LIMIT 1000)`);
}
export async function processNextJob(): Promise<boolean> {
    const job = await claimJob();
    if (!job)
        return false;
    let lost = false;
    const heartbeat = setInterval(() => {
        void renewJob(job).then(ok => {
            if (!ok)
                lost = true;
        }).catch(() => { lost = true; });
    }, 30000);
    try {
        await executeJob(job);
        if (!lost)
            await settleJob(job);
    }
    catch {
        if (!lost)
            await settleJob(job, true);
        console.warn('[Jobs] Job execution failed; sanitized details retained.');
    }
    finally {
        clearInterval(heartbeat);
    }
    return true;
}
export async function runWorker({ signal }: {
    signal: AbortSignal;
}): Promise<void> {
    while (!signal.aborted) {
        try {
            await db.transaction(tx => enqueueJob(tx, {
                type: 'maintenance.prune-idempotency', eventKey: `prune-idempotency:${new Date().toISOString().slice(0, 13)}`, payload: {}, runAt: new Date()
            }));
            await processNextJob();
        }
        catch {
            console.warn('[Jobs] Worker cycle failed; will retry.');
        }
        try {
            await delay(5000, undefined, {
                signal
            });
        }
        catch {
            if (!signal.aborted)
                throw new Error('WORKER_WAIT_FAILED');
        }
    }
}
