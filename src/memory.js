class ConversationMemory {
  constructor(limit = 10) {
    this.limit = limit;
    this.store = new Map();
  }

  _getOrCreate(channelId) {
    if (!this.store.has(channelId)) {
      this.store.set(channelId, []);
    }
    return this.store.get(channelId);
  }

  addUserMessage(channelId, content) {
    this._push(channelId, { role: 'user', content });
  }

  addAssistantMessage(channelId, content) {
    this._push(channelId, { role: 'assistant', content });
  }

  _push(channelId, item) {
    const history = this._getOrCreate(channelId);
    history.push(item);

    if (history.length > this.limit * 2) {
      history.splice(0, history.length - this.limit * 2);
    }
  }

  getHistory(channelId) {
    return [...(this.store.get(channelId) || [])];
  }

  reset(channelId) {
    this.store.delete(channelId);
  }
}

module.exports = {
  ConversationMemory
};
