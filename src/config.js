const DEFAULT_SYSTEM_PROMPT = `Tu es Garmin, une IA conversationnelle utile et naturelle.
Réponds de façon claire, directe et concise.
Langue par défaut: français.
Si l'utilisateur écrit en anglais, réponds en anglais.
Garde un ton amical, évite le blabla inutile.
Si l'information est incertaine, dis-le honnêtement et propose une alternative.`;

const config = {
  botName: process.env.BOT_NAME || 'Garmin',
  defaultLanguage: 'fr',
  tone: 'amical, utile, direct',
  maxResponseChars: 1800,
  maxDiscordMessageLength: 2000,
  memoryLimit: 10,
  model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  temperature: 0.7,
  apiTimeoutMs: 30_000,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  commandPrefix: '!',
  typingRefreshMs: 8_000,
  fallbackErrorMessage:
    "Désolé, j'ai eu un souci temporaire avec l'IA. Réessaie dans quelques secondes."
};

module.exports = {
  config,
  DEFAULT_SYSTEM_PROMPT
};
