import { Role } from "@prisma/client";
import { prisma } from "./prisma";

interface AuditParams {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Writes an append-only audit record. Never throws into the caller's flow. */
export async function recordAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata as never,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", params.action, err);
  }
}
