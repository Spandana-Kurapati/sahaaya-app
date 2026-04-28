// src/gemini.js
// ──────────────────────────────────────────────────────────
// Sahaya — Gemini 1.5 Flash integration
// Replace GEMINI_API_KEY with your key from
// https://aistudio.google.com/app/apikey
// ──────────────────────────────────────────────────────────

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // 🔑 Replace this
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt, imageBase64 = null, mimeType = 'image/jpeg') {
  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: mimeType, data: imageBase64 } });
  }
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Analyze an incident and return structured JSON:
 * { priority: 1-10, category: string, autoSummary: string }
 */
export async function analyzeIncident(description, imageBase64 = null) {
  const prompt = `You are an emergency response AI for the Sahaya disaster relief platform.
Analyze the following incident report and image (if provided).

Rules:
- Rate urgency on a scale of 1-10. Life-threatening situations = 10.
- Category must be one of: Flood, Medical, Rescue, Food, Shelter, Fire, Infrastructure, Other
- autoSummary should be a crisp 1-2 sentence summary for responders.
- Respond ONLY with valid JSON, no markdown fences, no preamble.

Format: {"priority": number, "category": string, "autoSummary": string}

Incident description: ${description || 'No description provided.'}`;

  try {
    const raw = await callGemini(prompt, imageBase64);
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return {
      priority:    Math.min(10, Math.max(1, Number(result.priority) || 5)),
      category:    result.category || 'Other',
      autoSummary: result.autoSummary || description,
    };
  } catch (err) {
    console.warn('Gemini parse failed, using fallback:', err);
    // Fallback: basic keyword priority
    const desc = (description || '').toLowerCase();
    const priority =
      desc.includes('life') || desc.includes('death') || desc.includes('critical') ? 9 :
      desc.includes('urgent') || desc.includes('trapped') || desc.includes('flood')  ? 7 :
      desc.includes('food')   || desc.includes('shelter')                             ? 5 : 4;
    return {
      priority,
      category: 'Other',
      autoSummary: description || 'Incident reported — awaiting review.',
    };
  }
}
