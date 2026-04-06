// Netlify serverless function for AI chat

const SYSTEM_PROMPT = `You are a helpful career advisor for BYU Economics students. You have access to data about BYU economics graduates, their career paths, and labor market information.

Your role is to:
1. Help students explore career options based on real graduate outcomes
2. Provide information about job market outlook from BLS data
3. Offer guidance on skills development and career preparation
4. Share insights about specific industries, companies, and roles

Guidelines:
- Be encouraging but realistic about career prospects
- Reference specific data when available (e.g., "X% of graduates went into finance")
- Suggest actionable next steps when appropriate
- Keep responses concise but informative (aim for 2-4 paragraphs)
- Use bullet points for lists of options or recommendations
- If you don't have specific data, say so and provide general guidance

Remember: You're speaking with current BYU economics students who are exploring their career options.`;

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, context } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Build the context message
    const contextMessage = `
Here is data about BYU Economics graduates to help inform your response:

**Graduate Statistics:**
${context.summary}

**Industry Distribution:**
${context.industryBreakdown}

**Top Employers:**
${context.topCompanies}

**Graduate School Destinations:**
${context.topGradSchools}

**BLS Job Outlook Data:**
${context.blsOutlook}

**BYU Economics Program Information:**
${context.byuProgram}
`;

    // Determine which AI provider to use
    const provider = process.env.AI_PROVIDER || 'anthropic';

    let response;
    if (provider === 'openai') {
      response = await callOpenAI(message, contextMessage);
    } else {
      response = await callAnthropic(message, contextMessage);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process chat request',
        details: error.message
      })
    };
  }
};

async function callAnthropic(userMessage, context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

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
      system: SYSTEM_PROMPT + '\n\n' + context,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(userMessage, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

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
        {
          role: 'system',
          content: SYSTEM_PROMPT + '\n\n' + context
        },
        {
          role: 'user',
          content: userMessage
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
