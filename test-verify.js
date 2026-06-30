const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyAbXL1vh7bMGcor47QVTG2YRfiYBZ81PW4",
  authDomain: "cityfix-adfb5.firebaseapp.com",
  projectId: "cityfix-adfb5",
  storageBucket: "cityfix-adfb5.firebasestorage.app",
  messagingSenderId: "283529357336",
  appId: "1:283529357336:web:47d53dca6fa5e8e86abb6d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "issues"), where("description", "==", "new pothole"));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("No issues found with description 'new pothole'.");
    process.exit(1);
  }
  
  const issueId = snap.docs[0].id;
  const issueDoc = snap.docs[0].data();
  console.log("Testing with Issue ID:", issueId);
  
  // Test 1: Real before/after pair
  console.log("\n--- TEST 1: Real pair ---");
  const res1 = await fetch("http://localhost:3000/api/verify-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueId })
  });
  console.log(await res1.text());
  
  // Test 2: Modify Firestore to make afterPhotoUrl = photoUrl
  console.log("\n--- TEST 2: Suspicious (same photo) ---");
  const originalAfter = issueDoc.afterPhotoUrl;
  await updateDoc(doc(db, "issues", issueId), {
    afterPhotoUrl: issueDoc.photoUrl
  });
  
  const res2 = await fetch("http://localhost:3000/api/verify-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueId })
  });
  console.log(await res2.text());
  
  // Restore
  await updateDoc(doc(db, "issues", issueId), {
    afterPhotoUrl: originalAfter
  });
  console.log("Restored original after photo.");
  
  process.exit(0);
}

run();
