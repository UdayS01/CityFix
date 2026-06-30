<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1200px-Google_%22G%22_logo.svg.png" width="80" alt="Google Tech" />
  <h1 align="center">CityFix: AI-Powered Civic Resolution</h1>
  <p align="center">
    <strong>Bridging the gap between citizens and local government through Multimodal AI.</strong>
  </p>
</div>

<br />

## 🌍 The Problem
Reporting a pothole, a broken streetlight, or illegal dumping is traditionally a massive headache. Citizens struggle to figure out exactly who to call, and when they do, the process feels like tossing a complaint into a void. On the flip side, city workers are overwhelmed with duplicate reports, manual triage, and the sheer impossibility of verifying every single repair without massive overhead. 

**We built CityFix to make civic reporting as easy as posting on social media, while completely automating the triage and verification process for the government.**

---

## ✨ How It Works (The Core Flow)

CityFix is built on a strictly separated, **five-phase workflow**:

1. **Reporting:** A citizen snaps a photo of an issue and drops a pin on our interactive map.
2. **AI Triage (Zero-touch):** The image is sent straight to **Google Gemini 2.0 Flash**. Without human involvement, the AI visually analyzes the photo to write a descriptive title, score the severity (Low/Medium/High/Critical), and route the ticket to the exact government department (e.g., Sanitation, Public Works).
3. **Smart Clustering:** Before saving, our backend checks the geographic coordinates. If someone else already reported the exact same pothole 20 meters away, the app groups them together. The city gets one actionable ticket instead of 50 spam reports.
4. **Government Dashboard:** City workers log into a dedicated, Kanban-style dashboard. They only see issues assigned to their specific department. Once they fix a problem, they upload a proof photo.
5. **AI Verification & Gamification:** We pass both the original photo and the new proof photo back to Gemini. The AI acts as an impartial auditor, visually confirming if the specific issue was actually repaired. If approved, the citizen gets an alert to confirm the fix, and they are rewarded with **Civic Points** for their community contribution!

---

## 🛠️ Technical Architecture & Stack

### Frontend
- **Next.js 15 (App Router)** & **React 19**
- **Tailwind CSS v4** for utility-first styling.
- **Framer Motion** for buttery-smooth, hardware-accelerated animations.
- **Lucide React** for crisp, scalable iconography.

### Google Technologies & AI
- **Google Gemini API (Gemini 2.0 Flash):** 
  Gemini is the brain of the app. We built secure server-side API routes that pass base64 images to Gemini alongside strict JSON-schema prompts. This forces Gemini to return structured, typed data (department, severity, title) that our database can digest instantly. We heavily rely on its multimodal capabilities for both the initial **Zero-shot Classification** and the final **Visual Auditing** (verifying repairs by comparing two photos).
  
- **Google Maps Platform:** 
  Utilizing the `@vis.gl/react-google-maps` library, we built a highly interactive map interface. Citizens drop precise coordinate pins (Lat/Lng), and our "Live Issues" explorer aggregates active Firestore documents to render custom markers on a city heatmap.

### Backend Infrastructure
- **Firebase Suite (Firestore, Auth, Storage):**
  - **Firestore** handles real-time syncing via `onSnapshot` listeners. When a citizen submits a report, it pops up on the government dashboard instantly—no refresh required.
  - **Firebase Authentication** manages Google Sign-In for citizens and strict Email/Password Role-Based Access Control (RBAC) for city workers.
  - **Firebase Storage** securely hosts all high-res "before" and "after" photo evidence.

- **Firebase App Hosting (Google Cloud Run):**
  To secure our Gemini API keys and Firebase Admin credentials, we couldn't deploy a simple static site. We leveraged Firebase App Hosting, which automatically containerizes the Next.js app and deploys it to **Google Cloud Run**. This provides a massively scalable, server-side rendered (SSR) backend right out of the box with zero DevOps headache.

---

## 🚀 Running Locally

Want to spin up CityFix on your own machine?

1. **Clone the repository:**
   ```bash
   git clone https://github.com/UdayS01/CityFix.git
   cd CityFix/cityfix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your keys:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
   # ... add remaining Firebase config variables
   FIREBASE_SERVICE_ACCOUNT_KEY=your_base64_encoded_service_account
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:** Navigate to `http://localhost:3000` to see the magic.

---
<div align="center">
  <i>Built with ❤️ for a better, smarter, and more transparent city.</i>
</div>
