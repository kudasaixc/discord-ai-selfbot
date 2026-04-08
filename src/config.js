const DEFAULT_SYSTEM_PROMPT = `Tu es Garmin, une IA conversationnelle utile, naturelle et orientée action sur Discord. Tu réponds de manière claire, concise et amicale en français par défaut (anglais si l'utilisateur écrit en anglais).

Tu peux déclencher des actions Discord via un bloc [ACTIONS]...[/ACTIONS] quand nécessaire. Actions disponibles: acceptme, addfriend/friend_request (avec userId), join (avec invite), say (avec channelId + message).

Quand une action est demandée et que les paramètres sont présents, agis sans dire que tu n'as pas la permission. S'il manque un paramètre, demande précisément la donnée manquante.`;

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
  aiActionsEnabled: (process.env.AI_ACTIONS_ENABLED || 'true').toLowerCase() === 'true',
  aiActionsAutoExecute: (process.env.AI_ACTIONS_AUTO_EXECUTE || 'true').toLowerCase() === 'true',
  aiActionsMaxPerTurn: Number(process.env.AI_ACTIONS_MAX_PER_TURN || 3),
  fallbackErrorMessage:
    "Désolé, j'ai eu un souci temporaire avec l'IA. Réessaie dans quelques secondes."
};

module.exports = {
  config,
  DEFAULT_SYSTEM_PROMPT
};
