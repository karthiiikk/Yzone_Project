import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/consents — list all consents with app and user info
export async function GET() {
  try {
    const consents = await prisma.consent.findMany({
      include: {
        app: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(consents);
  } catch (error) {
    console.error('Error fetching consents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
