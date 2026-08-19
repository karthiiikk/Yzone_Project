import { createHash } from 'crypto';
import { prisma } from './prisma';

/**
 * Creates a tamper-evident audit log entry using a SHA-256 hash chain.
 * Each entry's `currentHash` incorporates the `previousHash`, creating
 * a verifiable chain. Any modification to a past entry breaks the chain.
 */
export async function createAuditEntry({
  consentId,
  clientId,
  requestedScope,
  status,
}: {
  consentId: string;
  clientId: string;
  requestedScope: string;
  status: 'ALLOWED' | 'DENIED';
}) {
  // Fetch the most recent audit log to get the chain's previous hash
  const lastLog = await prisma.auditLog.findFirst({
    orderBy: { accessedAt: 'desc' },
    select: { currentHash: true },
  });

  const previousHash = lastLog?.currentHash ?? 'GENESIS'; // First entry has no predecessor
  const timestamp = new Date().toISOString();

  // Compute current hash: SHA-256 of all significant fields + previousHash
  const hashInput = `${previousHash}|${consentId}|${clientId}|${requestedScope}|${status}|${timestamp}`;
  const currentHash = createHash('sha256').update(hashInput).digest('hex');

  const auditLog = await prisma.auditLog.create({
    data: {
      consentId,
      clientId,
      requestedScope,
      status,
      previousHash,
      currentHash,
    },
  });

  return auditLog;
}
