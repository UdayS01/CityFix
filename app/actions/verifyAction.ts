"use server";

import { verifyIssue } from "../lib/verifyIssue";
import { adminDb } from "../lib/firebase-admin";

export async function processVerification(issueId: string) {
  try {
    // 1. Call Gemini verification
    const verification = await verifyIssue(issueId);
    const { verdict, reasoning, confidence } = verification;
    
    // 2. Prepare the base update fields
    const updateData: any = {
      aiVerificationVerdict: verdict,
      aiVerificationReasoning: reasoning,
      aiVerificationConfidence: confidence,
      verifiedAt: new Date(),
    };

    // 3. Update status based on verdict
    if (verdict === "fixed") {
      updateData.status = "pending_citizen_confirmation";
    } else {
      // not_fixed or suspicious
      updateData.status = "reopened";
      updateData.afterPhotoUrl = null;
      updateData.workDoneAt = null;
    }

    await adminDb.collection("issues").doc(issueId).update(updateData);
    
    return { success: true, verdict };
  } catch (error: any) {
    console.error("Verification process failed:", error);
    
    try {
      await adminDb.collection("issues").doc(issueId).update({
        status: "verification_failed"
      });
    } catch (dbError) {
      console.error("Failed to set verification_failed status:", dbError);
    }
    
    return { success: false, error: error.message || "Failed to verify issue" };
  }
}
