import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consent = await prisma.consent.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return NextResponse.json(consent);
  } catch (error) {
    console.error('Error granting consent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
