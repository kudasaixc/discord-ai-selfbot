const OpenAI = require('openai');
const { config } = require('./config');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function buildInput(systemPrompt, history, userPrompt) {
  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: systemPrompt }]
    }
  ];

  for (const item of history) {
    const contentType = item.role === 'assistant' ? 'output_text' : 'input_text';
    input.push({
      role: item.role,
      content: [{ type: contentType, text: item.content }]
    });
  }

  input.push({
    role: 'user',
    content: [{ type: 'input_text', text: userPrompt }]
  });

  return input;
}

function extractResponseText(response) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = [];
  for (const out of response.output || []) {
    for (const c of out.content || []) {
      if (typeof c.text === 'string') {
        chunks.push(c.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

async function generateReply({ userPrompt, history }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.apiTimeoutMs);

  try {
    const response = await client.responses.create(
      {
        model: config.model,
        temperature: config.temperature,
        max_output_tokens: 700,
        input: buildInput(config.systemPrompt, history, userPrompt)
      },
      { signal: controller.signal }
    );

    const text = extractResponseText(response);
    if (!text) {
      throw new Error('Réponse OpenAI vide.');
    }

    return text;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Délai dépassé lors de l’appel OpenAI.');
    }

    const apiError = error?.error?.message || error.message || 'Erreur API inconnue';
    throw new Error(`OpenAI error: ${apiError}`);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  generateReply
};
