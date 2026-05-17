// api/analyze-meal.js
// Vercel serverless function — runs server-side only
// API key is never sent to the browser

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mediaType } = req.body;

  if (!imageBase64 || !mediaType) {
    return res.status(400).json({ error: "Missing imageBase64 or mediaType" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI service not configured" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `Analyse this food image and estimate the nutritional content.
                
Respond with ONLY a valid JSON object in exactly this format — no other text:
{
  "meal_name": "descriptive meal name",
  "estimated_calories": 500,
  "protein_g": 30,
  "carbs_g": 50,
  "fat_g": 15,
  "confidence": "low|medium|high",
  "notes": "brief note about the estimate"
}

Rules:
- All numeric values must be integers
- confidence must be exactly "low", "medium", or "high"  
- If you cannot identify food in the image, set confidence to "low" and use 0 for all values
- Base estimates on typical portion sizes visible in the image
- meal_name should be concise (2-5 words)`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude API error:", err);
      return res.status(502).json({ error: "AI service error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse the JSON response
    let parsed;
    try {
      // Strip any markdown fences if present
      const clean = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", text);
      return res.status(502).json({ error: "Could not parse AI response" });
    }

    // Validate and sanitise the response
    const result = {
      meal_name: String(parsed.meal_name || "Unknown meal"),
      estimated_calories: Math.max(0, Math.round(Number(parsed.estimated_calories) || 0)),
      protein_g: Math.max(0, Math.round(Number(parsed.protein_g) || 0)),
      carbs_g: Math.max(0, Math.round(Number(parsed.carbs_g) || 0)),
      fat_g: Math.max(0, Math.round(Number(parsed.fat_g) || 0)),
      confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
      notes: String(parsed.notes || ""),
    };

    return res.status(200).json(result);

  } catch (err) {
    console.error("analyze-meal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
