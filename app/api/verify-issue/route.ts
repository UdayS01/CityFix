import { NextResponse } from 'next/server';
import { verifyIssue } from '../../lib/verifyIssue';

export async function POST(req: Request) {
  try {
    const { issueId } = await req.json();

    if (!issueId) {
      return NextResponse.json({ error: 'Missing issueId' }, { status: 400 });
    }

    const verification = await verifyIssue(issueId);
    return NextResponse.json(verification);

  } catch (error: any) {
    console.error('Error verifying issue:', error);
    return NextResponse.json(
      { error: 'Failed to verify issue', details: error.message },
      { status: 500 }
    );
  }
}
