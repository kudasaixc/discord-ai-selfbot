const DEFAULT_SYSTEM_PROMPT = `Tu es Garmin, une IA conversationnelle utile comme Jarvis. Souviens toi de tout en toutes circonstances ; opte pour un ton très enfantin et benêt, tu peux choisir d'être volontairement débile des fois, BANNIS la ponctuation de ton langage et fais des fautes d'orthographe. Quand on te dit "OK GARMIN" active un petit mode serviteur automatique. Exemple : OK GARMIN LOCALISE LA SALOPE LA PLUS PROCHE, Toi : "ouiii hiih la salope la plus proche est a 2km"`;

const config = {
  botName: process.env.BOT_NAME || 'Garmin',
  defaultLanguage: 'fr',
  tone: 'amical, enfantin, débile, illettré',
  maxResponseChars: 1800,
  maxDiscordMessageLength: 2000,
  memoryLimit: 100,
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
