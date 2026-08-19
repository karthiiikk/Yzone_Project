import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditEntry } from '@/lib/audit';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dataguard-dev-secret-change-in-production';

// Mock protected data store — scoped by category
const PROTECTED_DATA: Record<string, unknown> = {
  'read:health:metrics': { heartRate: 72, bloodOxygen: 98, restingHeartRate: 61 },
  'read:health:steps':   { steps: 8400, caloriesBurned: 312, activeMinutes: 47 },
  'read:health:sleep':   { sleepHours: 7.5, deepSleepHours: 1.8, remSleepHours: 1.2 },
  'read:location:current':  { city: 'New York', lat: 40.7128, lng: -74.006, accuracy: '10m' },
  'read:location:history':  { recentPlaces: ['Home', 'Central Park', 'Gym', 'Office'] },
};

// GET /api/v1/protected-data?scope=<scope>
// Expects: Authorization: Bearer <jwt_access_token>
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const url = new URL(request.url);
  const requestedScope = url.searchParams.get('scope') ?? '';

  // 1. Extract and verify JWT
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or malformed Authorization header. Expected: Bearer <token>' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  let payload: {
    userId: string;
    appId: string;
    consentId: string;
    grantedScopes: string[];
  };

  try {
    payload = jwt.verify(token, JWT_SECRET) as typeof payload;
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError
      ? 'Token has expired'
      : 'Invalid token signature';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { consentId, appId, grantedScopes } = payload;

  // 2. Look up consent record
  const consent = await prisma.consent.findUnique({
    where: { id: consentId },
    include: { app: true },
  });

  if (!consent) {
    return NextResponse.json({ error: 'Consent record not found' }, { status: 404 });
  }

  const now = new Date();

  // 3a. Auto-expire if clock ran out
  if (consent.expiresAt && consent.expiresAt < now && consent.status === 'ACTIVE') {
    await prisma.consent.update({
      where: { id: consentId },
      data: { status: 'EXPIRED' },
    });
    consent.status = 'EXPIRED';
  }

  // 3b. Validate consent status
  if (consent.status !== 'ACTIVE') {
    await createAuditEntry({
      consentId,
      clientId: consent.app.id,
      requestedScope: requestedScope || 'unknown',
      status: 'DENIED',
    });
    return NextResponse.json(
      { error: `Access denied. Consent status is "${consent.status}".` },
      { status: 403 }
    );
  }

  // 3c. Validate requested scope is in grantedScopes
  if (requestedScope && !grantedScopes.includes(requestedScope)) {
    await createAuditEntry({
      consentId,
      clientId: consent.app.id,
      requestedScope,
      status: 'DENIED',
    });
    return NextResponse.json(
      { error: `Access denied. Scope "${requestedScope}" was not granted.` },
      { status: 403 }
    );
  }

  // 4. All checks passed — write ALLOWED audit log and return data
  await createAuditEntry({
    consentId,
    clientId: consent.app.id,
    requestedScope: (requestedScope || grantedScopes[0]) ?? 'read:all',
    status: 'ALLOWED',
  });

  // Return only the data relevant to the requested scope
  const effectiveScope = requestedScope || grantedScopes[0];
  const responseData = effectiveScope && PROTECTED_DATA[effectiveScope]
    ? { [effectiveScope]: PROTECTED_DATA[effectiveScope] }
    : Object.fromEntries(
        grantedScopes
          .filter((s) => PROTECTED_DATA[s])
          .map((s) => [s, PROTECTED_DATA[s]])
      );

  return NextResponse.json({
    data: responseData,
    consentId,
    grantedScopes,
    accessedAt: now.toISOString(),
  });
}
