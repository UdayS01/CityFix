import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    await getAuth().verifyIdToken(token); // Verify authenticated gov user

    const { issueId } = await req.json();

    if (!issueId) {
      return NextResponse.json({ error: 'Missing issueId' }, { status: 400 });
    }

    await adminDb.collection('issues').doc(issueId).update({
      status: 'reopened'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reopening issue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
