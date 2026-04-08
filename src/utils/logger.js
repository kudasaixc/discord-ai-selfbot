function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  if (meta) {
    console.log(`[${timestamp()}] [${level}] ${message}`, meta);
    return;
  }
  console.log(`[${timestamp()}] [${level}] ${message}`);
}

module.exports = {
  info: (message, meta) => log('INFO', message, meta),
  warn: (message, meta) => log('WARN', message, meta),
  error: (message, meta) => log('ERROR', message, meta)
};
