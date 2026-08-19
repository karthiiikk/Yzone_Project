import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// GET /api/apps — list all registered apps
export async function GET() {
  try {
    const apps = await prisma.clientApp.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(apps);
  } catch (error) {
    console.error('Error fetching apps:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/apps — register a new third-party app
export async function POST(request: Request) {
  try {
    const { name, description, defaultScopes } = await request.json();

    if (!name || !description || !Array.isArray(defaultScopes) || defaultScopes.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, defaultScopes (array)' },
        { status: 400 }
      );
    }

    const clientId = slugify(name);

    // Check for duplicate clientId
    const existing = await prisma.clientApp.findUnique({ where: { clientId } });
    if (existing) {
      return NextResponse.json(
        { error: `An app with clientId "${clientId}" already exists. Choose a different name.` },
        { status: 409 }
      );
    }

    const app = await prisma.clientApp.create({
      data: {
        name,
        description,
        clientId,
        defaultScopes: JSON.stringify(defaultScopes),
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch (error) {
    console.error('Error creating app:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
