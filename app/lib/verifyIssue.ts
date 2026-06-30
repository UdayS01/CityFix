import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { callGeminiWithRetry } from './gemini-retry';
import { adminDb } from './firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);

export async function verifyIssue(issueId: string) {
  // 1. Fetch issue from Firestore using Admin SDK
  const issueRef = adminDb.collection('issues').doc(issueId);
  const issueDoc = await issueRef.get();

  if (!issueDoc.exists) {
    throw new Error('Issue not found');
  }

  const data = issueDoc.data();
  if (!data || !data.photoUrl || !data.afterPhotoUrl) {
    throw new Error('Missing before or after photos');
  }

  const { photoUrl, afterPhotoUrl, category, description } = data;

  // 2. Fetch both images and convert to base64
  const [beforeResponse, afterResponse] = await Promise.all([
    fetch(photoUrl),
    fetch(afterPhotoUrl)
  ]);

  if (!beforeResponse.ok || !afterResponse.ok) {
    throw new Error('Failed to fetch images');
  }

  const beforeArrayBuffer = await beforeResponse.arrayBuffer();
  const afterArrayBuffer = await afterResponse.arrayBuffer();

  const beforeBase64 = Buffer.from(beforeArrayBuffer).toString('base64');
  const afterBase64 = Buffer.from(afterArrayBuffer).toString('base64');
  
  const beforeMimeType = beforeResponse.headers.get('content-type') || 'image/jpeg';
  const afterMimeType = afterResponse.headers.get('content-type') || 'image/jpeg';

  const beforeImagePart = {
    inlineData: { data: beforeBase64, mimeType: beforeMimeType },
  };
  
  const afterImagePart = {
    inlineData: { data: afterBase64, mimeType: afterMimeType },
  };

  // 3. Setup Gemini model with structured output
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          verdict: {
            type: SchemaType.STRING,
            description: "The verdict on whether the issue was fixed.",
            format: "enum",
            enum: ["fixed", "not_fixed", "suspicious"]
          },
          confidence: {
            type: SchemaType.NUMBER,
            description: "0 to 100 representing your confidence in this verdict"
          },
          reasoning: {
            type: SchemaType.STRING,
            description: "A short 1-2 sentence explanation of your decision"
          }
        },
        required: ["verdict", "confidence", "reasoning"]
      }
    }
  });

  // 4. Construct prompt and call Gemini
  const prompt = `
    You are an expert civic infrastructure inspector. 
    You are reviewing a repair for a civic issue. 
    Category: ${category}
    Original Citizen Description: ${description}
    
    You are provided with two images:
    Image 1 (Before): The original state of the issue.
    Image 2 (After): The state after the government claims to have fixed it.
    
    Your job is to determine if the issue has been credibly fixed.
    
    Definitions for verdict:
    - "fixed": The after-photo clearly shows the same location and the issue (e.g., pothole, leak, broken light) is repaired.
    - "not_fixed": There is genuine evidence of an attempt, but the issue still visibly exists or the repair is grossly inadequate.
    - "suspicious": The photos look identical, the after-photo shows a completely unrelated location, or it does not credibly demonstrate real work was done. Check carefully that the after-photo plausibly shows the SAME location as the before-photo, not just a generic fixed version of this category somewhere else.
  `;

  const result = await callGeminiWithRetry(() => model.generateContent([prompt, beforeImagePart, afterImagePart]));
  const responseText = result.response.text();
  
  return JSON.parse(responseText);
}
