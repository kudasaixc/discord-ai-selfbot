const { generateReply } = require('../openai');
const { config } = require('../config');
const { splitDiscordMessage, truncateText } = require('../utils/text');
const logger = require('../utils/logger');

function createTypingLoop(client, channelId, intervalMs) {
  let timer = null;

  const kick = async () => {
    try {
      await client.sendChannelTyping(channelId);
    } catch {
      // non bloquant
    }
  };

  return {
    async start() {
      await kick();
      timer = setInterval(kick, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
    }
  };
}

function detectLanguageHint(text, fallback = 'fr') {
  if (!text) return fallback;
  const looksEnglish = /\b(the|and|what|how|please|thanks|can you|could you|i need|help)\b/i.test(text);
  return looksEnglish ? 'en' : fallback;
}

function stripMention(content, userId) {
  return (content || '')
    .replace(new RegExp(`<@!?${userId}>`, 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildConfigSummary() {
  return [
    `Nom: ${config.botName}`,
    `Modèle: ${config.model}`,
    `Ton: ${config.tone}`,
    `Langue défaut: ${config.defaultLanguage}`,
    `Mémoire: ${config.memoryLimit} échanges`,
    `Max réponse: ${config.maxResponseChars} caractères`,
    `Température: ${config.temperature}`
  ].join('\n');
}

async function sendReply(client, channelId, text) {
  const chunks = splitDiscordMessage(text, config.maxDiscordMessageLength);
  for (const chunk of chunks) {
    await client.createMessage(channelId, chunk);
  }
}

function shouldTrigger(msg, selfId) {
  const content = msg.content || '';
  const mentionRegex = new RegExp(`<@!?${selfId}>`);

  return {
    isDm: Boolean(msg.guildID == null),
    hasMention: mentionRegex.test(content),
    hasName: new RegExp(`\\b${config.botName}\\b`, 'i').test(content)
  };
}

async function handleCommand(client, msg, memory, command) {
  switch (command) {
    case 'ping':
      await client.createMessage(msg.channel.id, 'pong 🏓');
      return true;
    case 'reset':
      memory.reset(msg.channel.id);
      await client.createMessage(msg.channel.id, 'Mémoire du salon réinitialisée.');
      return true;
    case 'config':
      await client.createMessage(msg.channel.id, `Configuration actuelle:\n${buildConfigSummary()}`);
      return true;
    case 'help':
      await client.createMessage(
        msg.channel.id,
        [
          'Commandes disponibles:',
          '!ping - Vérifie que Garmin répond.',
          '!reset - Supprime la mémoire courte du salon/DM.',
          '!config - Affiche la configuration active.',
          '!help - Affiche cette aide.'
        ].join('\n')
      );
      return true;
    default:
      return false;
  }
}

function registerMessageHandler(client, memory) {
  client.on('messageCreate', async (msg) => {
    try {
      if (!msg || !msg.author) return;
      if (msg.author.bot) return;
      if (msg.author.id === client.user.id) return;

      const raw = (msg.content || '').trim();
      if (raw.startsWith(config.commandPrefix)) {
        const command = raw.slice(config.commandPrefix.length).split(/\s+/)[0].toLowerCase();
        const done = await handleCommand(client, msg, memory, command);
        if (done) return;
      }

      const detection = shouldTrigger(msg, client.user.id);
      if (!detection.isDm && !detection.hasMention && !detection.hasName) return;

      const prompt = detection.hasMention ? stripMention(msg.content, client.user.id) : raw;
      const cleanPrompt = prompt || '(Message vide)';
      const lang = detectLanguageHint(cleanPrompt, config.defaultLanguage);

      memory.addUserMessage(msg.channel.id, cleanPrompt);
      const history = memory.getHistory(msg.channel.id);

      const typing = createTypingLoop(client, msg.channel.id, config.typingRefreshMs);
      await typing.start();

      try {
        const finalPrompt = `Langue attendue: ${lang}.\nMessage utilisateur: ${cleanPrompt}`;
        const response = await generateReply({ userPrompt: finalPrompt, history });
        const safe = truncateText(response, config.maxResponseChars);
        await sendReply(client, msg.channel.id, safe);
        memory.addAssistantMessage(msg.channel.id, safe);
      } catch (error) {
        logger.error('Échec génération OpenAI', { error: error.message });
        await client.createMessage(msg.channel.id, config.fallbackErrorMessage);
      } finally {
        typing.stop();
      }
    } catch (error) {
      logger.error('Erreur non gérée messageCreate', { error: error.message });
    }
  });
}

module.exports = {
  registerMessageHandler
};
