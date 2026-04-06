const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Load environment variables from .env file if it exists
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
      console.log('Loaded .env file');
    }
  } catch (e) {
    console.log('No .env file found');
  }
}

loadEnv();

// Chat handler
async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { message, context, conversationHistory = [] } = JSON.parse(body);

      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
      const provider = process.env.AI_PROVIDER || 'anthropic';

      // Use demo mode if no valid API key
      if (!apiKey || apiKey === 'your_api_key_here' || apiKey.length < 20) {
        // Return a helpful demo response if no API key
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          response: getDemoResponse(message, context)
        }));
        return;
      }

      // Call actual AI API
      let response;
      if (provider === 'openai') {
        response = await callOpenAI(message, context, apiKey, conversationHistory);
      } else {
        response = await callAnthropic(message, context, apiKey, conversationHistory);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));

    } catch (error) {
      console.error('Chat error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// Demo response when no API key is configured
function getDemoResponse(message, context) {
  const msgLower = message.toLowerCase();

  if (msgLower.includes('job') || msgLower.includes('career')) {
    return `Based on data from **592 BYU Economics graduates**, here are the most common career paths:

**Top Industries:**
- Banking and Finance: 148 graduates (25%)
- Tech and Data Analytics: 133 graduates (22%)
- Management Consulting: 38 graduates (6%)
- Policy/Non-Profit: 39 graduates (7%)
- Economic Consulting: 19 graduates (3%)

**Top Employers:**
- Goldman Sachs (19 graduates)
- Fidelity Investments (19 graduates)
- Qualtrics (7 graduates)
- Cornerstone Research (6 graduates)
- Deloitte (5 graduates)

Economics graduates are well-positioned for analytical roles across many industries. The quantitative skills you develop are highly valued in finance, tech, and consulting.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('salary') || msgLower.includes('pay') || msgLower.includes('earn')) {
    return `According to BLS data, here are typical salaries for economics-related careers:

**Median Salaries:**
- Data Scientists: $108,020
- Economists: $113,940
- Financial Analysts: $99,890
- Management Analysts: $99,410
- Market Research Analysts: $74,680

**Entry-level range:** $55,000 - $85,000
**Mid-career range:** $85,000 - $150,000
**Senior level:** $150,000+

Investment banking and consulting typically offer higher starting salaries but require longer hours.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('phd')) {
    return `For a PhD in economics, the key is building a strong quantitative foundation. Take the 500-level sequence (ECON 580, 581, 582, 588), and math is critical—many successful applicants have a math minor or take real analysis. Research experience matters a lot too; try to RA for a professor to see if research is right for you. BYU grads have gone to top programs like Chicago, MIT, Stanford, Berkeley, and Cornell.

What year are you, and have you started any of the 500-level courses yet?

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('grad') || msgLower.includes('school') || msgLower.includes('mba')) {
    return `BYU Economics grads pursue lots of paths—PhD, MBA, law school, MPA, and more. The preparation looks different for each: PhD needs heavy math and research experience, MBA benefits from 2-3 years of work experience first, and law school is all about GPA and LSAT.

What type of graduate program are you considering?

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('consult')) {
    return `**Economic Consulting** is a popular path for BYU Economics graduates, with 19 graduates in this field.

**Top Economic Consulting Firms Hiring BYU Grads:**
- Cornerstone Research (6)
- Charles River Associates (3)
- Analysis Group
- Berkeley Research Group

**What Economic Consultants Do:**
- Apply economic theory to legal and business disputes
- Conduct statistical analysis for litigation support
- Prepare expert reports and testimony support
- Work on antitrust, securities, and IP cases

**Key Skills:**
- Econometrics and statistical software (Stata, R)
- Data analysis and visualization
- Clear written and oral communication
- Attention to detail

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('invest') || msgLower.includes('bank') || msgLower.includes('finance')) {
    return `**Banking and Finance** is the largest career destination for BYU Economics graduates, with 148 graduates (25%).

**Top Finance Employers:**
- Goldman Sachs (19 graduates)
- Fidelity Investments (19 graduates)
- Morgan Stanley (4)
- Bank of America (3)
- Piper Sandler (2)

**Common Roles:**
- Investment Banking Analyst
- Financial Analyst
- Equity Research Associate
- Wealth Management
- Private Equity Analyst

**Key Locations:**
- Salt Lake City (large Goldman Sachs office)
- New York City
- Houston, Texas

Many graduates start in Salt Lake City and later move to larger financial centers.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  // Default response
  return `I'm the BYU Economics Career Advisor! I have data on **592 BYU Economics graduates** and can help you explore:

- **Career paths** in finance, tech, consulting, policy, and more
- **Top employers** hiring BYU Economics grads
- **Salary expectations** from BLS data
- **Graduate school** options and destinations
- **Skills to develop** for your target career

Try asking me something like:
- "What jobs can I get with an economics degree?"
- "Tell me about careers in investment banking"
- "What's the salary outlook for data scientists?"
- "How do I prepare for graduate school?"

*Note: This is a demo response. Configure your API key in .env for full AI-powered responses.*`;
}

async function callAnthropic(message, context, apiKey, conversationHistory = []) {
  const systemPrompt = `You are a career advisor for BYU Economics students. You have ACCESS TO REAL DATA about 592 BYU Economics graduates and must use this data to answer questions accurately.

IMPORTANT INSTRUCTIONS:
- ALWAYS cite specific numbers from the data below (e.g., "148 graduates (25%) went into Banking and Finance")
- When asked about companies, reference the ACTUAL companies and counts from the data
- When asked about industries, use the EXACT percentages from the data
- Be specific and data-driven, not generic
- If asked about something not in the data, say so honestly

=== BYU ECONOMICS GRADUATE DATA (592 graduates) ===

INDUSTRY BREAKDOWN (where graduates work now):
${context.industryBreakdown}

TOP EMPLOYERS (companies that hired the most BYU Econ grads):
${context.topCompanies}

TOP LOCATIONS (where graduates work):
${context.topLocations || 'Not available'}

GRADUATE SCHOOL DESTINATIONS (for those who pursued advanced degrees):
${context.topGradSchools}

DEGREE TYPES PURSUED:
${context.degreeTypes || 'Not available'}

EXAMPLE GRADUATES BY INDUSTRY (real people from the dataset):
${context.industryExamples || 'Not available'}

=== BLS JOB MARKET DATA ===
${context.blsOutlook}

=== BYU ECONOMICS PROGRAM INFO ===
Department: Economics, College of Family, Home, and Social Sciences, BYU
Location: 2146 West View Building, Provo, UT 84602
Contact: (801) 422-2859, economics@byu.edu
Academic Advisor: Megan Hancock at Liberal Arts Advisement Center (1049 JFSB)
Career Services Director: Amanda Peterson (2590 WSC, 801-422-3000, careers.byu.edu)

=== COURSE SEQUENCE (USE THIS FOR CLASS ADVICE) ===
The economics major has 3 components: Foundational (3), Core (6), and Electives (4).

FOUNDATIONAL COURSES (complete first):
- ECON 110 (3 credits) - Principles of Economics (C- or better required)
- MATH 112 or 113 (4 credits) - Calculus
- ECON 210 (1 credit) - Career Prep Seminar (take first semester as a major)

CORE COURSES - Two parallel sequences:
Theory Sequence:
1. ECON 380 - Intermediate Micro Theory 1
2. ECON 381 - Intermediate Macro Theory
3. ECON 382 - Intermediate Micro Theory 2

Data Analysis Sequence:
1. ECON 378 - Statistics for Economists
2. ECON 388 - Econometrics
3. ECON 398 - Applied Econometrics

All core courses require C- or better.

ELECTIVES: 4 courses at 400 or 500 level (most require ECON 378 and 380 first)

DEFAULT 5-SEMESTER SEQUENCE (recommended):
Semester 1: ECON 210, ECON 378, ECON 380
Semester 2: ECON 381, ECON 388
Semester 3: ECON 382, ECON 398
Semester 4: 2 Electives
Semester 5: 2 Electives

4-SEMESTER ACCELERATED (only if student requests faster graduation):
Semester 1: ECON 210, ECON 378, ECON 380
Semester 2: ECON 381, ECON 388, 1 Elective
Semester 3: ECON 382, ECON 398, 1 Elective
Semester 4: 2 Electives

IMPORTANT: Default to the 5-semester sequence unless the student explicitly says they want to graduate faster. Taking one theory + one data course per semester is the recommended pace.

KEY RESOURCES:
- Career Prep Seminar (required for career preparation)
- Handshake platform for jobs/internships (use BYU NetID)
- Weekly email blasts with job/internship opportunities (email economics@byu.edu to join)
- Economics Student Association (ESA) - networking, speakers, company visits
- Women in Econ group (byuwomeninecon@gmail.com)

INTERNSHIPS:
- Department strongly encourages all majors to complete an internship
- Internship Coordinator: econ-internships@byu.edu
- Internship Grant available (funded by alumni) - deadlines: March 20 (spring/summer), July 15 (fall), Nov 30 (winter)
- Washington Seminar for DC internships (congressional, policy, economics)
- Historical Internships List shows past placements

GRADUATE SCHOOL PREP:
- Grad School Guide resource available
- Research assistant positions with faculty (reach out to professors whose research interests you)
- Honors thesis program
- Pre-doctoral research positions support

=== BYU ECONOMICS FACULTY & RESEARCH AREAS ===
When students ask about research opportunities, suggest faculty based on their interests:

LABOR ECONOMICS: Brigham Frandsen, Lars Lefgren (Dept Chair), Eric Eide, David Sims, Riley Wilson, Christian vom Lehn, Tanner Eastmond, Anthony Yim, Richard Patterson

HEALTH ECONOMICS: James Cardon, Eric Eide, Mark Showalter, Joseph Price, Matthew Butler

ECONOMICS OF EDUCATION: Eric Eide, David Sims, Joseph Price, Joshua Price, Richard Patterson, Mark Showalter, Anthony Yim

ENVIRONMENTAL ECONOMICS: Arden Pope, Jaren Pope, Eric Lewis

BEHAVIORAL ECONOMICS: Richard Patterson, Olga Stoddard, Joseph Price, Joshua Price

PUBLIC ECONOMICS: Emily Leslie, Riley Wilson, Anthony Yim

LAW AND ECONOMICS: James Kearl, Emily Leslie

ECONOMETRICS: Brigham Frandsen, Steven Waters, Anthony Yim

MACROECONOMICS: Christian vom Lehn

INTERNATIONAL TRADE: Scott Bradford

GAME THEORY/MECHANISM DESIGN: Brennan Platt

FINANCIAL ECONOMICS: Scott Condie

DEVELOPMENT ECONOMICS: Olga Stoddard

INDUSTRIAL ORGANIZATION: James Cardon, Eric Lewis

Staff contacts:
- Andrea Sneed: Department Manager
- Maci Jackson: Internship and Alumni Coordinator

SKILLS DEVELOPED:
Economic theory, econometrics, Stata, R, Python, data analysis, financial modeling, research methodology, policy analysis

GRADE REQUIREMENTS:
C- or higher in MATH 112 and ECON 110, 378, 380, 381, 382, & 388

=== ECON TRACKS (Career-Aligned Elective Groupings) ===
The department groups electives into tracks aligned with career paths. Use these when advising on electives:

1. BANKING AND FINANCE
   - Roles: Investment Banking Analyst, Equity Research, Financial Analyst, Wealth Advisor
   - Employers: JPMorgan, Goldman Sachs, Bank of America
   - Courses: ACC 201, ACC 202, FIN 201, IS 110, IS 201, ECON 450
   - Clubs: Finance Club
   - Grad paths: MFA, MBA

2. ECONOMIC CONSULTING
   - Roles: Analyst, Economic Consultant, Research Associate, Litigation Support
   - Employers: Analysis Group, Bates White, Cornerstone, NERA
   - Courses: ECON 420, ECON 450, ECON 442, ECON 476, ECON 588
   - Experience: Research assistant positions with faculty
   - Grad paths: PhD in Economics, MBA

3. MANAGEMENT CONSULTING
   - Roles: Associate Consultant, Business Analyst, Strategy Analyst
   - Employers: McKinsey, Bain, BCG, Deloitte, PwC, EY-Parthenon, KPMG, Cicero Group
   - Courses: ECON 442, ECON 450, Strategy Minor
   - Clubs: Management Consulting Association (MCA)
   - Grad paths: MBA

4. TECH AND DATA ANALYTICS
   - Roles: Data Analyst, Business Analyst, Product Analyst, Data Scientist
   - Employers: Google, Amazon, Meta, Apple, Qualtrics, Domo, Lucid
   - Courses: Upper division Math/Stats, ECON 442, ECON 484, ECON 588
   - Clubs: Data Science Club
   - Grad paths: Business Analytics, Statistics, MBA, PhD

5. POLICY/NON-PROFIT
   - Roles: Policy Analyst, Research Assistant (Fed, think tanks), Program Analyst
   - Employers: U.S. government departments, World Bank, nonprofits
   - Courses: ECON 440-475, POLI 200, POLI 203, POLI 331, Political Science Minor
   - Clubs: Beyond BYU, Foreign Service Student Org, Model UN
   - Grad paths: MPA, Master of Public Policy

6. HEALTHCARE
   - Roles: Healthcare Analyst, HEOR Analyst, Pricing/Reimbursement Analyst
   - Employers: IQVIA, Optum, Avalere Health, Intermountain, Kaiser, UnitedHealth
   - Courses: ECON 465 (Health Economics), Healthcare Leadership Minor
   - Clubs: Healthcare Leadership Association
   - Grad paths: Healthcare Admin, Medical School, Dental School

7. PRE-PHD
   - Roles: Predoctoral Research Assistant (Predoc), Research Analyst
   - Employers: Academic institutions, think tanks, Federal Reserve
   - Courses: ECON 580, ECON 581, ECON 582, ECON 588, Math Minor/Major
   - Experience: Undergraduate research assistant with faculty
   - Grad paths: PhD in Economics, Public Policy, Finance, Operations Research

=== PHD PLACEMENT DATA (350+ placements on record) ===
TOP PHD PROGRAMS FOR BYU ECONOMICS GRADS:
1. Chicago (28 students)
2. MIT (18 students)
3. Stanford (15 students)
4. Berkeley (14 students)
5. Cornell (14 students)
6. Washington State (12 students)
7. Duke (11 students)
8. Harvard (10 students)
9. UCSD (9 students)
10. Maryland (9 students)
11. Texas A&M (9 students)
12. UT Austin (8 students)
13. Princeton (7 students)
14. Wisconsin (6 students)
15. Notre Dame (6 students)

RECENT PHD PLACEMENTS (2019-2025 cohorts currently in programs):
- Stanford: Katelyn Cranney (2023), Nick Grasley (2019), Merrill Warnick (2019)
- MIT: George Garcia (2021)
- Chicago: McKay Jensen (2020), Josh Higbee (2019), Sam Higbee (2019)
- Duke: Jacob Hutchings (2025), Jaimie Choi (2020)
- Berkeley: Abigail Willis (2022), Gwyneth Miner (2019)
- Princeton: Robert Wagner (2019)
- Notre Dame: Britton Davis (2025), Amber Oldroyd Ebeling (2023), Michael Jensen (2021)
- Michigan: Parker Howell (2023)
- Cornell: Daniel Sabey (2020), Adrian Haws (2020)

NOTABLE ALUMNI OUTCOMES (completed PhDs):
- Christopher Palmer (BYU 2008, MIT PhD 2014) → MIT Sloan Professor
- Brad Larsen (BYU 2008, MIT PhD 2013) → Washington University Professor
- Devin Pope (BYU 2002, Berkeley PhD 2007) → Chicago Booth Professor
- Ryan Hill (BYU 2014, MIT PhD 2020) → Northwestern Professor
- Bryan Seegmiller (BYU 2016, MIT PhD 2022) → Northwestern Professor
- Eric Bettinger (BYU 1996, MIT PhD 2000) → Stanford Education Professor
- Brigham Frandsen (BYU 2004, MIT PhD 2010) → BYU Professor
- Gordon Dahl (BYU 1993, Princeton PhD 1998) → UCSD Professor
- Lant Pritchett (BYU 1983, MIT PhD 1988) → Harvard Professor
- Whitney Newey (BYU 1978, MIT PhD 1983) → MIT Professor (Econometrics pioneer)
- Brigitte Madrian (BYU 1989, MIT PhD 1993) → BYU Marriott School

FACULTY RETURNING TO BYU (with PhD):
Riley Wilson, Emily Leslie, Jeff Denning, Paul Eliason, Eric Lewis, Rich Patterson, Brigham Frandsen, Joseph Price, Christian von Lehn, and many more

CURRENT PHD STUDENTS (IP = In Progress):
60+ students currently in PhD programs at top universities

8. LAW
   - Why Econ: Strong training in logic, argumentation, policy analysis valued by law schools
   - Courses: ECON 442 (Behavioral), ECON 476 (Law & Econ), ECON 478 (Antitrust)
   - Experience: Research/internships in legal reasoning or public policy
   - Grad paths: JD (Law School)

When students ask about careers or electives, recommend the relevant track and its associated courses/clubs.

RESPONSE GUIDELINES:
1. ANSWER FIRST - Directly respond to what they asked with useful, actionable guidance
2. KEEP IT FOCUSED - 1 short paragraph of solid information (not a wall of text)
3. THEN ENGAGE - End with ONE follow-up question to personalize the next response
4. SKIP THE STATS DUMP - Mention program names without counts, focus on what students should DO
5. NAMES OPTIONAL - Alumni names aren't as important; preparation steps matter more

EXAMPLE GOOD RESPONSE (for "I'm interested in a PhD"):
"For a PhD in economics, the key is building a strong quantitative foundation. Take the 500-level sequence (ECON 580, 581, 582, 588), and math is critical - many successful applicants have a math minor or take real analysis. Research experience matters a lot too; try to RA for a professor to see if research is right for you.

What year are you, and have you started any of the 500-level courses yet?"

EXAMPLE BAD RESPONSE (just questions, no substance):
"A PhD is a great path! What type of economics interests you? Have you thought about research?"

Remember: Give them something valuable, then ask ONE question to keep the conversation going.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(message, context, apiKey, conversationHistory = []) {
  const systemPrompt = `You are a helpful career advisor for BYU Economics students...`; // Similar to above

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Static file handler
function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Main server
const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route requests
  if (req.url === '/.netlify/functions/chat' && req.method === 'POST') {
    handleChat(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     BYU Economics Career Explorer - Local Server           ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Server running at: http://localhost:${PORT}                  ║
║                                                            ║
║  To enable full AI responses, create a .env file with:     ║
║    ANTHROPIC_API_KEY=your_key_here                         ║
║    AI_PROVIDER=anthropic                                   ║
║                                                            ║
║  Without an API key, demo responses will be shown.         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});
