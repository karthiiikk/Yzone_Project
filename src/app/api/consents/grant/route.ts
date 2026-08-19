import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dataguard-dev-secret-change-in-production';

// POST /api/consents/grant — approve a consent request and issue a JWT access token
export async function POST(request: Request) {
  try {
    const { consentId, grantedScopes, durationMs } = await request.json();

    if (!consentId || !Array.isArray(grantedScopes) || grantedScopes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: consentId, grantedScopes (non-empty array)' },
        { status: 400 }
      );
    }

    // Validate duration (default: 30 days)
    const duration = typeof durationMs === 'number' && durationMs > 0
      ? durationMs
      : 30 * 24 * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + duration);

    // Fetch the consent and verify it's in REQUESTED state
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      include: { app: true, user: true },
    });

    if (!consent) {
      return NextResponse.json({ error: 'Consent not found' }, { status: 404 });
    }

    if (consent.status !== 'REQUESTED') {
      return NextResponse.json(
        { error: `Consent is already in "${consent.status}" state. Only REQUESTED consents can be granted.` },
        { status: 409 }
      );
    }

    // Update consent to ACTIVE with user-chosen scopes and expiry
    const updatedConsent = await prisma.consent.update({
      where: { id: consentId },
      data: {
        status: 'ACTIVE',
        grantedScopes: JSON.stringify(grantedScopes),
        expiresAt,
      },
    });

    // Sign a JWT access token encoding the consent grant
    const tokenPayload = {
      userId: consent.userId,
      appId: consent.appId,
      consentId: consent.id,
      grantedScopes,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: Math.floor(duration / 1000), // JWT exp is in seconds
      issuer: 'dataguard',
      subject: consent.userId,
    });

    return NextResponse.json({
      consent: updatedConsent,
      accessToken,
      expiresAt: expiresAt.toISOString(),
      tokenType: 'Bearer',
    });
  } catch (error) {
    console.error('Error granting consent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
