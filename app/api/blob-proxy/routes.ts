import { put, list, del } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await list({
      token: process.env.NEXT_PUBLIC_BOB_ST_READ_WRITE,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Blob list error:', error);
    return NextResponse.json(
      { error: 'Failed to list blobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, data, options } = await request.json();
    const result = await put(name, data, options);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Blob put error:', error);
    return NextResponse.json({ error: 'Failed to put blob' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json();
    const result = await del(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Blob delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete blob' },
      { status: 500 }
    );
  }
}
