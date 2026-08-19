import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/users — returns the default user (Alice) for the single-user demo
export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!user) {
      return NextResponse.json({ error: 'No users found. Run database seed.' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
