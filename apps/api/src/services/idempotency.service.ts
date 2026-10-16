import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { Actor } from '@bus-aesh/shared';
import * as schema from '../db/schema.js';
import type { db } from '../db/index.js';
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export function canonicalHash(input: unknown): string {
    function normalize(value: any): any {
        if (Array.isArray(value))
            return value.map(normalize);
        if (value && typeof value === 'object')
            return Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, normalize(value[key])]));
        return value;
    }
    return createHash('sha256').update(JSON.stringify(normalize(input))).digest('hex');
}
export function validateIdempotencyKey(key: unknown): string | undefined {
    if (key === undefined)
        return undefined;
    if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(key))
        throw new Error('INVALID_IDEMPOTENCY_KEY');
    return key;
}
export async function withIdempotency<T extends object>(actor: Actor, operation: string, input: unknown, rawKey: unknown, execute: (tx: Transaction) => Promise<T>): Promise<T & {
    replayed?: boolean;
}> {
    const key = validateIdempotencyKey(rawKey);
    const { db } = await import('../db/index.js');
    return db.transaction(async (tx) => {
        if (!key)
            return execute(tx); // Existing clients retain their current request behavior.
        const lock = `${actor.userId}:${operation}:${key}`;
        await tx.execute(sql `SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))`);
        const where = and(eq(schema.idempotencyRecords.actorId, actor.userId), eq(schema.idempotencyRecords.operation, operation), eq(schema.idempotencyRecords.key, key));
        const [record] = await tx.select().from(schema.idempotencyRecords).where(where);
        const hash = canonicalHash(input);
        if (record && record.expiresAt > new Date()) {
            if (record.requestHash !== hash)
                throw new Error('IDEMPOTENCY_KEY_REUSED');
            return {
                ...record.result as T, replayed: true
            };
        }
        if (record)
            await tx.delete(schema.idempotencyRecords).where(where);
        const result = await execute(tx);
        await tx.insert(schema.idempotencyRecords).values({
            actorId: actor.userId, operation, key, requestHash: hash, result: JSON.parse(JSON.stringify(result)), expiresAt: new Date(Date.now() + 86400000)
        });
        return result;
    });
}
