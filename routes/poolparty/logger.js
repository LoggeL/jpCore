const fetch = require('node-fetch')
const {
  TELEGRAM_CHAT_ID,
  TELEGRAM_BOT_TOKEN,
} = require('./telegramConfig.json')

module.exports = (data) => {
  console.log('Logger', data)

  let text = ''
  for (const [key, value] of Object.entries(data)) {
    // Capitalize first letter of key
    keyCap = key.charAt(0).toUpperCase() + key.slice(1)
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
  })
}
