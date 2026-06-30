import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getEscalatedSeverity } from '../../lib/constants';

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
    const { issueId } = await req.json();

    if (!issueId) {
      return NextResponse.json({ error: 'Missing issueId' }, { status: 400 });
    }

    const issueRef = adminDb.collection('issues').doc(issueId);

    // Run transaction
    const result = await adminDb.runTransaction(async (transaction) => {
      const issueDoc = await transaction.get(issueRef);
      
      if (!issueDoc.exists) {
        throw new Error('Issue not found');
      }

      const issueData = issueDoc.data()!;
      
      if (issueData.isPrimary !== true) {
        throw new Error('Can only vote on primary issues');
      }
      
      const voterIds = issueData.voterIds || [];
      const currentVoteCount = issueData.voteCount || 1;

      if (voterIds.includes(citizenId)) {
        return { alreadyVoted: true, voteCount: currentVoteCount };
      }

      const newVoteCount = currentVoteCount + 1;
      const escalatedSeverity = getEscalatedSeverity(issueData.severity || 'low', newVoteCount, !!issueData.autoEscalated);

      const updatePayload: any = {
        voteCount: FieldValue.increment(1),
        voterIds: FieldValue.arrayUnion(citizenId)
      };

      if (escalatedSeverity) {
        updatePayload.severity = escalatedSeverity;
        updatePayload.autoEscalated = true;
        updatePayload.escalatedAt = FieldValue.serverTimestamp();
      }

      // Add vote
      transaction.update(issueRef, updatePayload);
      
      return { alreadyVoted: false, voteCount: newVoteCount, escalatedSeverity };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error voting on issue:', error);
    if (error.message.includes('primary issues')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
