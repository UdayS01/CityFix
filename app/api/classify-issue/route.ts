import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { callGeminiWithRetry } from '../../lib/gemini-retry';
import { adminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { categoryToDepartment } from '../../lib/departments';
import { getEscalatedSeverity } from '../../lib/constants';

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Initialize the Google Generative AI SDK
// Note: We're using the NEXT_PUBLIC key here as it was defined in the environment,
// but typically API keys used only on the server should not have the NEXT_PUBLIC_ prefix.
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY as string);

export async function POST(req: Request) {
  let issueId: string | undefined;
  try {
    const body = await req.json();
    issueId = body.issueId;
    const { photoUrl, description } = body;

    if (!issueId || !photoUrl || !description) {
      return NextResponse.json(
        { error: 'Missing issueId, photoUrl or description in request body' }, 
        { status: 400 }
      );
    }

    // 1. Fetch the image from the provided URL and convert it to base64
    const imageResponse = await fetch(photoUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image from the provided URL' }, 
        { status: 500 }
      );
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // 2. Setup Gemini model with structured output configuration
    // Using gemini-1.5-flash as requested for fast, cheap, multimodal inference
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            category: {
              type: SchemaType.STRING,
              description: "The category of the civic issue based on the image and description.",
              format: "enum",
              enum: ["pothole", "water_leakage", "streetlight", "waste_management", "infrastructure", "other"],
            },
            severity: {
              type: SchemaType.STRING,
              description: "The severity level of the issue based on visual evidence and description.",
              format: "enum",
              enum: ["low", "medium", "high"],
            },
            reasoning: {
              type: SchemaType.STRING,
              description: "A short 1-2 sentence explanation of why this category and severity were chosen.",
            }
          },
          required: ["category", "severity", "reasoning"],
        },
      }
    });

    // 3. Construct the payload and call Gemini
    const prompt = `You are a civic issue classification AI. You are provided with an image and a user's text description. 
IMPORTANT: You MUST read and strongly consider the user's text description below when deciding the category and severity, as the image alone may not tell the full story.

User Description: "${description}"`;
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType
      }
    };

    const result = await callGeminiWithRetry(() => model.generateContent([prompt, imagePart]));
    const responseText = result.response.text();
    
    // The response is guaranteed to be a JSON string matching our schema
    const classification = JSON.parse(responseText);

    const departmentInfo = categoryToDepartment[classification.category] || categoryToDepartment.other;

    // 4. Implement duplicate clustering
    const issueRef = adminDb.collection('issues').doc(issueId);
    const issueDoc = await issueRef.get();
    
    if (!issueDoc.exists) {
      throw new Error("Issue not found before clustering");
    }
    
    const issueData = issueDoc.data()!;
    const loc = issueData.location;
    const citizenId = issueData.citizenId;

    // Find candidates
    const candidatesSnapshot = await adminDb.collection('issues')
      .where('category', '==', classification.category)
      .where('status', 'in', ['classified', 'reopened', 'pending_verification', 'pending_citizen_confirmation'])
      .get();

    let closestMatch: any = null;
    let minDistance = Infinity;

    candidatesSnapshot.forEach((doc) => {
      if (doc.id === issueId) return;
      
      const candidateData = doc.data();
      const cLoc = candidateData.location;
      if (!cLoc || !cLoc.lat || !cLoc.lng) return;

      const dist = getDistanceInMeters(loc.lat, loc.lng, cLoc.lat, cLoc.lng);
      if (dist <= 50 && dist < minDistance) {
        minDistance = dist;
        closestMatch = { id: doc.id, ...candidateData };
      }
    });

    const updatePayload: any = {
      category: classification.category,
      severity: classification.severity,
      department: departmentInfo,
      aiReasoning: classification.reasoning,
      status: 'classified'
    };

    if (closestMatch) {
      // 5. Match found: mark as duplicate and increment primary voteCount
      const targetClusterId = closestMatch.clusterId || closestMatch.id;
      
      updatePayload.clusterId = targetClusterId;
      updatePayload.isPrimary = false;

      await adminDb.runTransaction(async (transaction) => {
        const primaryRef = adminDb.collection('issues').doc(targetClusterId);
        const primaryDoc = await transaction.get(primaryRef);
        const primaryData = primaryDoc.data() || {};
        
        transaction.update(issueRef, updatePayload);
        
        const newVoteCount = (primaryData.voteCount || 1) + 1;
        const escalatedSeverity = getEscalatedSeverity(primaryData.severity || 'low', newVoteCount, !!primaryData.autoEscalated);
        
        const primaryUpdate: any = {
          voteCount: FieldValue.increment(1),
          voterIds: FieldValue.arrayUnion(citizenId)
        };
        
        if (escalatedSeverity) {
          primaryUpdate.severity = escalatedSeverity;
          primaryUpdate.autoEscalated = true;
          primaryUpdate.escalatedAt = FieldValue.serverTimestamp();
        }
        
        transaction.update(primaryRef, primaryUpdate);
      });
    } else {
      // 6. No match: establish as primary
      updatePayload.clusterId = issueId;
      updatePayload.isPrimary = true;
      updatePayload.voteCount = 1;
      updatePayload.voterIds = [citizenId];
      
      await issueRef.update(updatePayload);
    }

    // 5. Return the classification JSON
    return NextResponse.json({ ...classification, department: departmentInfo });

  } catch (error: any) {
    console.error('Error classifying issue with Gemini:', error);
    
    try {
      if (issueId) {
        await adminDb.collection('issues').doc(issueId).update({
          status: 'classification_failed'
        });
      }
    } catch (dbError) {
      console.error('Failed to set classification_failed status:', dbError);
    }
    
    return NextResponse.json(
      { error: 'Failed to classify issue', details: error.message },
      { status: 500 }
    );
  }
}
