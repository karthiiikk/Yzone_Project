import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/consents/request — initiate an OAuth-style consent flow
export async function POST(request: Request) {
  try {
    const { clientId, userId } = await request.json();

    if (!clientId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, userId' },
        { status: 400 }
      );
    }

    // Look up the app by clientId
    const app = await prisma.clientApp.findUnique({ where: { clientId } });
    if (!app) {
      return NextResponse.json(
        { error: `No app found with clientId: "${clientId}"` },
        { status: 404 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create a REQUESTED consent entry using the app's defaultScopes as the initial scope set
    const consent = await prisma.consent.create({
      data: {
        userId,
        appId: app.id,
        grantedScopes: app.defaultScopes, // Start with all default scopes; user refines at grant
        status: 'REQUESTED',
      },
      include: { app: true, user: true },
    });

    return NextResponse.json(consent, { status: 201 });
  } catch (error) {
    console.error('Error creating consent request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
