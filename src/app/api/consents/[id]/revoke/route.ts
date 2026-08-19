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
        status: 'REVOKED',
      },
    });

    return NextResponse.json(consent);
  } catch (error) {
    console.error('Error revoking consent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
