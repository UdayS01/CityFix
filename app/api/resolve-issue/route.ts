import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';

const CIVIC_POINTS_MAP: Record<string, number> = {
  low: 10,
  medium: 20,
  high: 30
};

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

    const citizenId = decodedToken.uid;
    const { issueId, action } = await req.json();

    if (!issueId || !action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const issueRef = adminDb.collection('issues').doc(issueId);
    const userRef = adminDb.collection('users').doc(citizenId);

    // Run transaction
    await adminDb.runTransaction(async (transaction) => {
      const issueDoc = await transaction.get(issueRef);
      
      if (!issueDoc.exists) {
        throw new Error('Issue not found');
      }

      const issueData = issueDoc.data();
      
      const voterIds = issueData?.voterIds || [];
      if (issueData?.citizenId !== citizenId && !voterIds.includes(citizenId)) {
        throw new Error('Forbidden: You can only resolve issues you reported or voted on');
      }
      
      if (issueData?.status !== 'pending_citizen_confirmation') {
        throw new Error('Issue is not pending confirmation');
      }

      if (action === 'confirm') {
        transaction.update(issueRef, {
          status: 'resolved',
          resolvedAt: FieldValue.serverTimestamp()
        });

        const severity = issueData.severity?.toLowerCase() || 'low';
        const pointsToAdd = CIVIC_POINTS_MAP[severity] || 10;

        transaction.set(userRef, {
          civicPoints: FieldValue.increment(pointsToAdd)
        }, { merge: true });

      } else if (action === 'reject') {
        transaction.update(issueRef, {
          status: 'reopened',
          afterPhotoUrl: null,
          workDoneAt: null
        });
      }
    });

    return NextResponse.json({ success: true, action });
  } catch (error: any) {
    console.error('Error resolving issue:', error);
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
