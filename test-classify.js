const run = async () => {
  const res = await fetch("http://localhost:3000/api/classify-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800",
      description: "There is a massive water leak here on the street."
    })
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
};
run();
