import { db } from '../db/index.js';
import * as schema from '../db/schema.js';

export interface SecurityEventParams {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any> | string;
  ipAddress?: string | null;
}

/**
 * Centrally records platform security, audit, and operational events into Postgres audit_logs table.
 * Fully error-guarded so audit failures never disrupt transaction flows.
 */
export async function logSecurityEvent(params: SecurityEventParams): Promise<void> {
  try {
    const detailsObj = typeof params.details === 'object' && params.details !== null
      ? params.details
      : { message: params.details || '' };

    await db.insert(schema.auditLogs).values({
      userId: params.userId || null,
      action: params.action.substring(0, 50),
      entityType: params.entityType ? params.entityType.substring(0, 50) : null,
      entityId: params.entityId ? String(params.entityId).substring(0, 255) : null,
      details: detailsObj,
      ipAddress: params.ipAddress ? params.ipAddress.substring(0, 45) : '127.0.0.1',
    });
  } catch (err) {
    console.error('[AuditService] Failed to record audit log:', err);
  }
}
