import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env'), override: true });

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
  console.error('ANTHROPIC_API_KEY is not set. Add your key to the .env file.');
  process.exit(1);
}

const app = express();
const PORT = 3001;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const ALL_CATEGORIES = [
  'government',
  'alliances',
  'rivalries',
  'religions',
  'history',
  'capitals',
  'geography',
];

const SYSTEM_PROMPT = `You are a geopolitics quiz master. Generate quiz questions about countries.

CATEGORIES (use the exact category name in your response):
- government: Types of government (democracy, monarchy, republic, theocracy, etc.)
- alliances: Military and economic alliances (NATO, EU, BRICS, ASEAN, African Union, etc.)
- rivalries: Geopolitical rivalries and tensions (historical and current)
- religions: Dominant religions and religious demographics
- history: Historical events (wars, revolutions, independence, treaties, colonial history)
- capitals: Capital cities (current and historical)
- geography: Regional geography (borders, continents, bodies of water, landmarks)

RULES:
- Every question must be tied to exactly ONE specific country.
- Provide exactly 4 answer choices.
- The correct answer must be one of the 4 choices.
- Vary the difficulty — mix easy, medium, and hard questions.
- The country_code must be a valid ISO 3166-1 alpha-2 code (e.g., "US", "FR", "JP").
- You MUST use the exact category assigned to you. Do NOT switch to a different category.
- Return ONLY valid JSON with no markdown fences, no extra text, no explanation outside the JSON.

CRITICAL — reveal_country and question text rules:
The quiz has TWO parts: (1) the text question with answer choices, and (2) a map click where the user must find the country. The country name is displayed on the map prompt ONLY when reveal_country is true.

There are exactly two valid patterns:

Pattern A (reveal_country: true): The question is ABOUT the country, and knowing the country name does NOT spoil the answer. The country name will be shown on the map as "Click on [country]".
  Example: "What type of government does France have?" → reveal_country: true
  Example: "Which alliance is Germany a member of?" → reveal_country: true

Pattern B (reveal_country: false): The answer to the question IS the country itself (or knowing the country would reveal the answer). The map will say "Click on the correct country" without naming it. In this case, the question text MUST explicitly name the country so the user knows what is being asked about. NEVER use vague phrases like "this country" or "this nation" — the country name MUST appear in the question.
  Example: "Which country has the capital city Paris?" → reveal_country: false (the question names Paris so user can answer, but showing "France" on map would spoil it)
  Example: "In which country did the Rwandan genocide occur in 1994?" → reveal_country: false (the question contains enough context via "Rwandan" but the map must not show Rwanda)

NEVER produce a question where the country name is hidden from BOTH the question text AND the map prompt. The user must always know what country the question is about from at least one source.

Return JSON in this exact structure:
{
  "question": "string",
  "category": "string",
  "country_name": "string",
  "country_code": "string",
  "options": ["string", "string", "string", "string"],
  "correct_answer": "string",
  "explanation": "string",
  "reveal_country": boolean
}`;

app.post('/api/generate-question', async (req, res) => {
  try {
    const { history, category } = req.body;

    // Pick a random category if none specified (or "all")
    let chosenCategory;
    if (category && category !== 'all') {
      chosenCategory = category;
    } else {
      // If we have history, avoid repeating the last 2 categories
      const recentCategories = (history || []).slice(-2).map(h => h.category);
      const available = ALL_CATEGORIES.filter(c => !recentCategories.includes(c));
      const pool = available.length > 0 ? available : ALL_CATEGORIES;
      chosenCategory = pool[Math.floor(Math.random() * pool.length)];
    }

    let userMessage;

    if (history && history.length > 0) {
      const recent = history.slice(-10);
      const historyLines = recent.map((h, i) =>
        `${i + 1}. ${h.country} — ${h.category} — knowledge: ${h.knowledgeCorrect ? 'correct' : 'wrong'}, map: ${h.mapCorrect ? 'correct' : 'wrong'}`
      ).join('\n');

      const recentCountries = recent.slice(-5).map(h => h.country).join(', ');

      userMessage = `Category for this question: "${chosenCategory}"

The student's recent answer history:
${historyLines}

Generate the next quiz question following these guidelines:
- The question MUST be in the "${chosenCategory}" category. Do not switch categories.
- Do NOT repeat any of these recently asked countries: ${recentCountries}.
- Pick a country from a different world region than the last 2-3 questions when possible.
- Vary the difficulty based on performance: harder if they're getting most right, easier if struggling.`;
    } else {
      userMessage = `Category for this question: "${chosenCategory}"

Generate a quiz question in the "${chosenCategory}" category about any country in the world. Pick a random, interesting country — not just major world powers.`;
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content[0].text;

    // Strip markdown fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleaned);
    res.json(parsed);
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({
      error: 'Failed to generate question',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Quiz API server running on http://localhost:${PORT}`);
});
