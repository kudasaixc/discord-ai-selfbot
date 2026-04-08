function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMentionFromPrompt(content, userId) {
  if (!content) return '';
  const mentionPattern = new RegExp(`<@!?${escapeRegex(userId)}>`, 'g');
  return content.replace(mentionPattern, '').replace(/\s+/g, ' ').trim();
}

function splitDiscordMessage(text, maxLen = 2000) {
  if (!text || text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let index = remaining.lastIndexOf('\n', maxLen);
    if (index < 1) index = remaining.lastIndexOf(' ', maxLen);
    if (index < 1) index = maxLen;

    const chunk = remaining.slice(0, index).trim();
    if (chunk) chunks.push(chunk);

    remaining = remaining.slice(index).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function truncateText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

module.exports = {
  stripMentionFromPrompt,
  splitDiscordMessage,
  truncateText
};
