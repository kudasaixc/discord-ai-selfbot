# Garmin — Discord IA Selfbot (Node.js)

Projet complet et modulaire d'un assistant IA Discord nommé **Garmin**.

> ⚠️ **Important**: ce projet fonctionne en mode **selfbot** (token utilisateur), ce qui peut contrevenir aux Conditions d'utilisation de Discord. Utilisez-le à vos risques.

## Fonctionnalités

- Déclenchement d'une réponse si :
  1. le compte selfbot est mentionné,
  2. un message contient `Garmin` (insensible à la casse),
  3. en message privé (DM).
- Appel à l'API OpenAI via le SDK officiel `openai`.
- Utilisation de **Responses API** (`client.responses.create`).
- Mémoire courte par salon/DM (10 derniers échanges par défaut).
- Commandes : `!ping`, `!reset`, `!config`, `!help`.
- Commandes de contrôle DM: `!acceptme`, `!join`, `!say`.
- Protection anti-boucle (ignore ses propres messages).
- Ignore les autres bots.
- Gestion robuste des erreurs, logs lisibles, typing indicator.
- Découpage automatique des réponses trop longues pour Discord.

## Prérequis

- Node.js **20+**
- Un compte Discord (token utilisateur)
- Une clé API OpenAI

## Installation

Commande exacte pour installer les dépendances :

```bash
npm install
```

## Configuration

1. Copier le fichier d'environnement :

```bash
cp .env.example .env
```

2. Remplir `.env` :

```env
DISCORD_BOT_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
BOT_NAME=Garmin
```

### Détails des variables

- `DISCORD_BOT_TOKEN` : token utilisateur Discord (selfbot).
- `OPENAI_API_KEY` : clé OpenAI.
- `OPENAI_MODEL` : modèle Responses API.
- `BOT_NAME` : nom détecté dans les messages.

## Lancement

Commande exacte pour démarrer le bot :

```bash
npm start
```

## Structure du projet

```txt
.
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src
    ├── index.js
    ├── config.js
    ├── openai.js
    ├── memory.js
    ├── discord
    │   └── messageHandler.js
    └── utils
        ├── logger.js
        └── text.js
```

## Création / configuration Discord (selfbot)

Comme c'est un selfbot :
- vous **n'enregistrez pas** une application bot classique,
- vous n'utilisez pas les scopes OAuth2 bot standards,
- les intents bot officiels ne s'appliquent pas de la même manière.

Le compte utilisateur connecté lit et répond directement aux messages qu'il reçoit.

## Prompt système Garmin (exemple)

Utilisé dans `src/config.js` :

- utile
- direct
- naturel
- pas trop verbeux
- français par défaut
- répond en anglais si l'utilisateur écrit en anglais

Texte proposé :

> Tu es Garmin, une IA conversationnelle utile et naturelle. Réponds de façon claire, directe et concise. Langue par défaut: français. Si l'utilisateur écrit en anglais, réponds en anglais. Garde un ton amical, évite le blabla inutile. Si l'information est incertaine, dis-le honnêtement et propose une alternative.

## Commandes

- `!ping` → test rapide (`pong`)
- `!reset` → reset de la mémoire du salon/DM courant
- `!config` → affiche la configuration active
- `!help` → aide
- `!acceptme` (en DM) → tente d'accepter la demande d'ami de l'auteur du DM
- `!join <lien/code>` (en DM) → tente de rejoindre un serveur via invitation
- `!say <channelId> <message>` (en DM) → envoie un message dans un salon ciblé

## Limites connues

- Le mode selfbot est fragile (changements Discord possibles).
- Risque de sanction côté Discord (compte limité/suspendu).
- Mémoire uniquement en RAM (perdue au redémarrage).
- Détection de langue volontairement simple (heuristique).
- Les réponses dépendent de la disponibilité OpenAI.

## Notes de maintenance

- `src/config.js` centralise les paramètres (ton, modèle, longueur max, timeout, etc.).
- `src/openai.js` encapsule tout l'appel OpenAI et les erreurs API.
- `src/discord/messageHandler.js` gère déclencheurs, commandes, DM et envoi de réponses.
