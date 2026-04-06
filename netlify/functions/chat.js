// Netlify serverless function for AI chat (Claude / Anthropic).
// Reads API key from Netlify environment variable: ANTHROPIC_API_KEY
//
// Chat quality upgrade: retrieve 5–10 relevant alumni examples from data/graduates.json
// and inject them into the context so responses are specific and grounded.

const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = `You are the BYU Economics Career Advisor.

You MUST follow these rules:
- Use ONLY the data provided in the CONTEXT block (alumni outcomes, BLS data, BYU program JSON, BYU web summaries). Do NOT invent stats, rankings, employer counts, class sequences, or requirements.
- If a user asks for a number and it is not explicitly in the context, say "I don’t have that number in the dataset" and suggest how to find it (for example: use the Alumni Explorer filters or official BYU pages).
- Prefer short, actionable answers: 3–8 bullets plus 1–2 short paragraphs. Lead with the most important advice first.
- When citing outcomes, include counts and percentages exactly as shown in the context. Do not round differently or guess.
- If the user asks about a specific company/industry/track/goal, tailor the answer to that topic AND ask exactly ONE follow-up question to refine the advice.
- When possible, cite 3–6 relevant alumni examples from the RELEVANT ALUMNI EXAMPLES section (names + roles + companies) to make the answer concrete.
- For questions about classes, sequencing, declaring the major/minor, minors-for-majors, or econ roadmaps, rely on the BYU PROGRAM INFO and BYU ECON WEB SUMMARIES sections. Do NOT guess course requirements or policies beyond what is written there.
- For questions about grad school in economics or other disciplines, base your guidance on the GRAD SCHOOL GUIDE, PHD PLACEMENTS SUMMARY, and BYU ECON WEB SUMMARIES. If something is not covered there, say you don’t know.
- Never claim you contacted BYU, accessed private systems, or viewed live student records. You are only using the static dataset and summaries provided.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { message, context, conversationHistory = [] } = JSON.parse(event.body || '{}');
    if (!message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Message is required' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response:
            'AI is not configured yet. Add `ANTHROPIC_API_KEY` in Netlify environment variables, then redeploy.\n\n' +
            'In the meantime, use the Alumni Explorer + Career Statistics tabs to answer questions from the dataset.'
        })
      };
    }

    const alumniExamples = getRelevantAlumniExamples(message, 8);
    const contextMessage = buildContextMessage(context || {}, alumniExamples);
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];

    const responseText = await callAnthropic({
      apiKey,
      userMessage: message,
      contextMessage,
      conversationHistory: history.slice(-10)
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: responseText })
    };
  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process chat request', details: error.message })
    };
  }
};

function buildContextMessage(context, alumniExamples) {
  const examplesBlock = (alumniExamples && alumniExamples.length)
    ? alumniExamples.map((ex, idx) => `${idx + 1}. ${ex}`).join('\n')
    : 'No specific alumni examples matched this question.';

  return `CONTEXT (use this as your only source of truth):

GRADUATE SUMMARY:
${context.summary || 'Not available'}

INDUSTRY DISTRIBUTION (CURRENT INDUSTRY):
${context.industryBreakdown || 'Not available'}

TOP EMPLOYERS:
${context.topCompanies || 'Not available'}

TOP LOCATIONS:
${context.topLocations || 'Not available'}

GRAD SCHOOL DESTINATIONS:
${context.topGradSchools || 'Not available'}

DEGREE TYPES:
${context.degreeTypes || 'Not available'}

BYU ECON MAJOR NAVIGATION & CORE SEQUENCING (from BYU web summaries):
${context.byuWeb?.navigatingMajor?.overview || 'Not available'}
Core sequences and hints:
- ${context.byuWeb?.navigatingMajor?.coreSequences?.theory?.join('; ') || 'Theory sequence not available'}
- ${context.byuWeb?.navigatingMajor?.coreSequences?.data?.join('; ') || 'Data sequence not available'}
- Hints: ${(context.byuWeb?.navigatingMajor?.coreSequences?.hints || []).join(' | ') || 'Not available'}

ECON ROADMAPS (planning tools):
${context.byuWeb?.econRoadmaps?.overview || 'Not available'}
Named roadmaps:
${Array.isArray(context.byuWeb?.econRoadmaps?.roadmaps)
  ? context.byuWeb.econRoadmaps.roadmaps.map(r => `- ${r.name}: ${r.objective} (when: ${r.when})`).join('\n')
  : 'Not available'}

MINORS FOR ECON MAJORS (recommended complements):
${context.byuWeb?.minorsForMajors?.summary || 'Not available'}
Recommended minors: ${(context.byuWeb?.minorsForMajors?.recommendedMinors || []).join(', ') || 'Not available'}

DECLARING THE ECON MAJOR / MINOR:
Major: ${context.byuWeb?.declareMajorMinor?.summaryMajor || 'Not available'}
Minor / second major: ${context.byuWeb?.declareMajorMinor?.summaryMinor || 'Not available'}
Advisement center: ${context.byuWeb?.declareMajorMinor?.advisementCenter || 'Not available'}

GRAD SCHOOL IN OTHER DISCIPLINES:
Common fields: ${(context.byuWeb?.gradSchoolOtherDisciplines?.commonFields || []).join(', ') || 'Not available'}
Application tips (high level): ${(context.byuWeb?.gradSchoolOtherDisciplines?.applicationTips || []).slice(0, 5).join(' | ') || 'Not available'}

GRAD PROGRAMS IN ECONOMICS (external PhD programs):
${context.byuWeb?.gradProgramsEcon?.note || 'Not available'}
High-level advice: ${context.byuWeb?.gradProgramsEcon?.advice || 'Not available'}

BLS JOB OUTLOOK:
${context.blsOutlook || 'Not available'}

BYU PROGRAM INFO (JSON):
${context.byuProgram || 'Not available'}

GRAD SCHOOL GUIDE (SUMMARY + CHECKLIST):
${context.gradSchoolGuide?.summaryText || 'Not available'}

KEY MATH PREP FOR PHD:
${context.gradSchoolGuide?.mathPrep || 'Not available'}

KEY RESEARCH PREP FOR PHD:
${context.gradSchoolGuide?.researchPrep || 'Not available'}

PHD PLACEMENTS SUMMARY:
${context.phdSummary || 'Not available'}

RELEVANT ALUMNI EXAMPLES (use for concrete references; do not invent details):
${examplesBlock}
`;
}

let _cachedGraduates = null;

function loadGraduates() {
  if (_cachedGraduates) return _cachedGraduates;
  // Try multiple paths – the correct one depends on Netlify's runtime extraction layout.
  const candidates = [
    path.join(__dirname, 'data', 'graduates.json'),
    path.join(process.cwd(), 'data', 'graduates.json'),
    path.resolve('data', 'graduates.json')
  ];
  let raw;
  for (const filePath of candidates) {
    try {
      raw = fs.readFileSync(filePath, 'utf8');
      break;
    } catch (_) { /* try next */ }
  }
  if (!raw) {
    console.error('graduates.json not found in any candidate path:', candidates);
    _cachedGraduates = [];
    return _cachedGraduates;
  }
  const parsed = JSON.parse(raw);
  _cachedGraduates = Array.isArray(parsed.graduates) ? parsed.graduates : [];
  return _cachedGraduates;
}

function norm(s) {
  return (s || '').toString().trim();
}

function tokenize(q) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s&/+.-]/g, ' ')
    .split(/\s+/g)
    .map(t => t.trim())
    .filter(t => t && t.length >= 3)
    .slice(0, 24);
}

function scoreGraduate(g, tokens) {
  const nameField = `${norm(g.firstName)} ${norm(g.lastName)}`.toLowerCase();
  const firstJobFields = [
    norm(g.firstCompany).toLowerCase(),
    norm(g.firstJobTitle).toLowerCase(),
    norm(g.firstIndustry).toLowerCase(),
    norm(g.firstLocation).toLowerCase()
  ];
  const currentJobFields = [
    norm(g.currentCompany).toLowerCase(),
    norm(g.currentJobTitle).toLowerCase(),
    norm(g.currentIndustry).toLowerCase(),
    norm(g.currentLocation).toLowerCase()
  ];
  const gradFields = [
    norm(g.gradSchool).toLowerCase(),
    norm(g.degreeType).toLowerCase(),
    norm(g.fieldOfStudy).toLowerCase()
  ];

  const hay = [
    nameField,
    ...firstJobFields,
    ...currentJobFields,
    ...gradFields
  ].join(' | ');

  let score = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (hay.includes(t)) {
      score += 2;
      // Slight extra weight if it matches first job fields
      if (firstJobFields.some(f => f && f.includes(t))) score += 1;
      // Slight extra weight if it matches current job fields on "now"/"current" questions
      if ((tokens.includes('now') || tokens.includes('current')) &&
          currentJobFields.some(f => f && f.includes(t))) {
        score += 1;
      }
    }
  }

  // Boost obvious intents
  if (tokens.includes('phd') && (hay.includes('phd') || hay.includes('ph.d'))) score += 3;
  if (tokens.includes('law') && (hay.includes('jd') || hay.includes('law'))) score += 2;
  if (tokens.includes('mba') && hay.includes('mba')) score += 2;

  return score;
}

function formatExample(g) {
  const name = `${norm(g.firstName)} ${norm(g.lastName)}`.trim() || 'Unknown';
  const year = norm(g.undergradYear);
  const first = [norm(g.firstJobTitle), norm(g.firstCompany)].filter(Boolean).join(' at ');
  const firstLoc = norm(g.firstLocation);
  const current = [norm(g.currentJobTitle), norm(g.currentCompany)].filter(Boolean).join(' at ');
  const currentLoc = norm(g.currentLocation);
  const grad = [norm(g.gradSchool), norm(g.degreeType), norm(g.fieldOfStudy)].filter(Boolean).join(' — ');

  const bits = [];
  bits.push(year ? `${name} (${year})` : name);
  if (first) bits.push(`First: ${first}${firstLoc ? ` — ${firstLoc}` : ''}`);
  if (current) bits.push(`Current: ${current}${currentLoc ? ` — ${currentLoc}` : ''}`);
  if (grad) bits.push(`Grad: ${grad}`);
  return bits.join(' | ');
}

function getRelevantAlumniExamples(userMessage, limit = 8) {
  const grads = loadGraduates();
  const tokens = tokenize(userMessage || '');
  if (!tokens.length) return [];

  const scored = [];
  for (const g of grads) {
    const s = scoreGraduate(g, tokens);
    if (s <= 0) continue;
    scored.push({ g, s });
  }

  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, limit).map(({ g }) => formatExample(g));
  return top;
}

async function callAnthropic({ apiKey, userMessage, contextMessage, conversationHistory }) {
  const messages = [];

  for (const m of conversationHistory || []) {
    if (!m || typeof m !== 'object') continue;
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (typeof m.content !== 'string') continue;
    messages.push({ role: m.role, content: m.content });
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 900,
      temperature: 0.2,
      system: `${SYSTEM_PROMPT}\n\n${contextMessage}`,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = Array.isArray(data.content) ? data.content : [];
  const first = content[0] || {};
  return first.text || 'No response text returned.';
}

