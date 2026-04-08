require('dotenv').config();

const Eris = require('eris');
const { config } = require('./config');
const { ConversationMemory } = require('./memory');
const { registerMessageHandler } = require('./discord/messageHandler');
const logger = require('./utils/logger');

function assertEnv() {
  const required = ['DISCORD_BOT_TOKEN', 'OPENAI_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Variables manquantes: ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  assertEnv();

  const intents =
    Eris.Constants.Intents.guildMessages |
    Eris.Constants.Intents.directMessages |
    Eris.Constants.Intents.messageContent;

  const client = new Eris(process.env.DISCORD_BOT_TOKEN, {
    autoreconnect: true,
    compress: true,
    intents
  });

  const memory = new ConversationMemory(config.memoryLimit);

  client.on('ready', () => {
    logger.info(`Connecté en tant que ${client.user.username}#${client.user.discriminator}`);
    logger.info(`Déclencheur nom: "${config.botName}"`);
    logger.info(`Intents actifs: guildMessages, directMessages, messageContent`);
    logger.warn("Attention: l'usage de selfbot peut violer les règles Discord.");
  });

  client.on('error', (error) => {
    logger.error('Erreur client Discord', { error: error?.message || String(error) });
  });

  registerMessageHandler(client, memory);
  await client.connect();
}

bootstrap().catch((error) => {
  logger.error('Échec démarrage application', { error: error.message });
  process.exit(1);
});
