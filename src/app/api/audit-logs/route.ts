import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/audit-logs — fetch full chronological audit trail
export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        consent: {
          include: {
            app: true,
            user: true,
          },
        },
        app: true,
      },
      orderBy: { accessedAt: 'desc' },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
