import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json({ error: 'No email found in token' }, { status: 403 });
    }

    const { issueId, afterPhotoUrl } = await req.json();

    if (!issueId || !afterPhotoUrl) {
      return NextResponse.json({ error: 'Missing issueId or afterPhotoUrl' }, { status: 400 });
    }

    // Verify government user and get department
    const govUsersSnapshot = await adminDb.collection('governmentUsers').where('email', '==', email).get();
    
    if (govUsersSnapshot.empty) {
      return NextResponse.json({ error: 'Not a registered government user' }, { status: 403 });
    }

    const department = govUsersSnapshot.docs[0].data().department;

    // Update the issue
    await adminDb.collection('issues').doc(issueId).update({
      afterPhotoUrl,
      workDoneAt: FieldValue.serverTimestamp(),
      workDoneBy: department,
      status: 'pending_verification'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking work done:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
