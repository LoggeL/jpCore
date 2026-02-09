let telegramConfig
try {
  telegramConfig = require('./telegramConfig.json')
} catch {
  console.warn('telegramConfig.json not found, Telegram logging disabled')
}

module.exports = (data) => {
  console.log('Logger', data)

  if (!telegramConfig) return

  const { TELEGRAM_CHAT_ID, TELEGRAM_BOT_TOKEN } = telegramConfig

  let text = ''
  for (const [key, value] of Object.entries(data)) {
    const keyCap = key.charAt(0).toUpperCase() + key.slice(1)
    text += `*${keyCap}*: ${value}\n`
  }

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'markdown',
  }

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  }).catch((err) => {
    console.error('Telegram logger error:', err)
  })
}
