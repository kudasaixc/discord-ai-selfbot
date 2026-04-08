const { generateReply } = require('../openai');
const { config } = require('../config');
const { splitDiscordMessage, truncateText } = require('../utils/text');
const logger = require('../utils/logger');
const CONTROL_COMMANDS = ['owner', 'acceptme', 'join', 'say', 'help-control'];
const ACTION_BLOCK_REGEX = /\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/i;

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
    `Température: ${config.temperature}`,
    `Actions IA activées: ${config.aiActionsEnabled ? 'oui' : 'non'}`,
    `Actions IA auto-exec: ${config.aiActionsAutoExecute ? 'oui' : 'non'}`,
    `Actions IA max/tour: ${config.aiActionsMaxPerTurn}`
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
          '!help - Affiche cette aide.',
          '',
          'Contrôle DM:',
          '!acceptme - Tente d’accepter la demande d’ami de la personne qui envoie la commande.',
          '!join <lien/code> - Tente de rejoindre un serveur via invitation.',
          '!say <channelId> <message> - Envoie un message dans un salon précis.',
          '!help-control - Rappelle les commandes de contrôle.',
          '',
          'Pilotage IA social (DM):',
          'Tu peux demander en langage naturel: rejoindre un serveur, accepter ton ami, écrire dans un channel.',
          "L'IA peut exécuter automatiquement ces actions selon la config."
        ].join('\n')
      );
      return true;
    case 'help-control':
      await client.createMessage(
        msg.channel.id,
        [
          'Commandes contrôle Discord (DM uniquement):',
          '!acceptme',
          '!join <lien/code>',
          '!say <channelId> <message>'
        ].join('\n')
      );
      return true;
    default:
      return false;
  }
}

function extractInviteCode(input = '') {
  const clean = input.trim();
  if (!clean) return null;
  const match = clean.match(/(?:discord\.gg\/|discord\.com\/invite\/)?([A-Za-z0-9-]+)/i);
  return match ? match[1] : clean;
}

async function handleControlCommand(client, msg, command, args) {
  if (!msg.channel || msg.guildID != null) return false;
  if (!CONTROL_COMMANDS.includes(command)) return false;
  if (command === 'owner') {
    await client.createMessage(msg.channel.id, 'ℹ️ La commande `!owner` est obsolète: le mode propriétaire est désactivé.');
    return true;
  }

  if (command === 'acceptme') {
    if (typeof client.addRelationship !== 'function') {
      await client.createMessage(
        msg.channel.id,
        '⚠️ Cette version du client Discord ne permet pas de gérer les demandes d’ami automatiquement.'
      );
      return true;
    }
    try {
      await client.addRelationship(msg.author.id, true);
      await client.createMessage(msg.channel.id, '✅ Tentative d’acceptation de votre demande d’ami effectuée.');
    } catch (error) {
      logger.error('Échec acceptation ami', { error: error.message });
      await client.createMessage(msg.channel.id, "❌ Impossible d'accepter la demande d'ami.");
    }
    return true;
  }

  if (command === 'join') {
    const code = extractInviteCode(args.join(' '));
    if (!code) {
      await client.createMessage(msg.channel.id, 'Usage: `!join <lien_ou_code_invitation>`');
      return true;
    }
    if (typeof client.acceptInvite !== 'function') {
      await client.createMessage(
        msg.channel.id,
        '⚠️ Cette version du client Discord ne permet pas de rejoindre des serveurs via commande.'
      );
      return true;
    }
    try {
      await client.acceptInvite(code);
      await client.createMessage(msg.channel.id, `✅ Invitation acceptée (code: ${code}).`);
    } catch (error) {
      logger.error('Échec acceptation invitation', { error: error.message, code });
      await client.createMessage(msg.channel.id, `❌ Impossible de rejoindre via l'invitation ${code}.`);
    }
    return true;
  }

  if (command === 'say') {
    const [channelId, ...messageParts] = args;
    const text = messageParts.join(' ').trim();
    if (!channelId || !text) {
      await client.createMessage(msg.channel.id, 'Usage: `!say <channelId> <message>`');
      return true;
    }
    try {
      await client.createMessage(channelId, text);
      await client.createMessage(msg.channel.id, `✅ Message envoyé dans le salon ${channelId}.`);
    } catch (error) {
      logger.error('Échec envoi salon ciblé', { error: error.message, channelId });
      await client.createMessage(msg.channel.id, `❌ Impossible d'envoyer le message dans ${channelId}.`);
    }
    return true;
  }

  return false;
}

function extractAiActions(rawResponse) {
  const text = rawResponse || '';
  const match = text.match(ACTION_BLOCK_REGEX);
  if (!match) {
    return { visibleText: text.trim(), actions: [] };
  }

  const visibleText = text.replace(ACTION_BLOCK_REGEX, '').trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    const actions = Array.isArray(parsed?.actions) ? parsed.actions : [];
    return { visibleText, actions };
  } catch (error) {
    logger.warn("Bloc ACTIONS invalide, ignoré", { error: error.message });
    return { visibleText, actions: [] };
  }
}

function normalizeAction(action) {
  if (!action || typeof action !== 'object') return null;
  const type = String(action.type || '').toLowerCase();
  if (!type) return null;
  return { ...action, type };
}

async function executeAiAction(client, msg, action) {
  if (!msg.channel || msg.guildID != null) {
    return '⚠️ Actions IA ignorées hors DM.';
  }

  if (action.type === 'acceptme') {
    if (typeof client.addRelationship !== 'function') {
      return "⚠️ Action `acceptme` indisponible avec ce client.";
    }
    await client.addRelationship(msg.author.id, true);
    return `✅ Ami accepté pour ${msg.author.username || msg.author.id}.`;
  }

  if (action.type === 'join') {
    const code = extractInviteCode(String(action.invite || ''));
    if (!code) return "❌ Action `join` ignorée: code d'invitation manquant.";
    if (typeof client.acceptInvite !== 'function') {
      return "⚠️ Action `join` indisponible avec ce client.";
    }
    await client.acceptInvite(code);
    return `✅ Serveur rejoint via ${code}.`;
  }

  if (action.type === 'say') {
    const channelId = String(action.channelId || '').trim();
    const text = String(action.message || '').trim();
    if (!channelId || !text) {
      return "❌ Action `say` ignorée: channelId/message manquant.";
    }
    await client.createMessage(channelId, text);
    return `✅ Message envoyé dans ${channelId}.`;
  }

  return `⚠️ Action IA inconnue: ${action.type}`;
}

async function executeAiActions(client, msg, rawActions) {
  const maxActions = Math.max(0, config.aiActionsMaxPerTurn || 0);
  const shortlist = rawActions.map(normalizeAction).filter(Boolean).slice(0, maxActions);
  const summaries = [];

  for (const action of shortlist) {
    try {
      const result = await executeAiAction(client, msg, action);
      summaries.push(result);
    } catch (error) {
      logger.error('Échec action IA', { error: error.message, action });
      summaries.push(`❌ Échec action ${action.type}: ${error.message}`);
    }
  }

  return summaries;
}

function registerMessageHandler(client, memory) {
  client.on('messageCreate', async (msg) => {
    try {
      if (!msg || !msg.author) return;
      if (msg.author.bot) return;
      if (msg.author.id === client.user.id) return;

      const raw = (msg.content || '').trim();
      if (raw.startsWith(config.commandPrefix)) {
        const parts = raw.slice(config.commandPrefix.length).trim().split(/\s+/);
        const command = (parts[0] || '').toLowerCase();
        const args = parts.slice(1);
        const controlDone = await handleControlCommand(client, msg, command, args);
        if (controlDone) return;
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
        const finalPrompt = [
          `Langue attendue: ${lang}.`,
          'Tu peux piloter le compte si utile.',
          'Si une action Discord est nécessaire, ajoute un bloc strict:',
          '[ACTIONS]{"actions":[{"type":"acceptme"},{"type":"join","invite":"CODE"},{"type":"say","channelId":"123","message":"..."}]}[/ACTIONS]',
          "Le texte hors bloc ACTIONS sera envoyé à l'utilisateur.",
          "N'invente jamais d'action si la demande ne l'exige pas.",
          `Message utilisateur: ${cleanPrompt}`
        ].join('\n');
        const response = await generateReply({ userPrompt: finalPrompt, history });
        const parsed = extractAiActions(response);
        const safe = truncateText(parsed.visibleText || '✅ Action traitée.', config.maxResponseChars);
        await sendReply(client, msg.channel.id, safe);
        memory.addAssistantMessage(msg.channel.id, safe);

        if (config.aiActionsEnabled && config.aiActionsAutoExecute && parsed.actions.length) {
          const actionResults = await executeAiActions(client, msg, parsed.actions);
          if (actionResults.length) {
            await sendReply(client, msg.channel.id, actionResults.join('\n'));
          }
        }
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
