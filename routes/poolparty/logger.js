const fetch = require('node-fetch')
const {
  TELEGRAM_CHAT_ID,
  TELEGRAM_BOT_TOKEN,
} = require('./telegramConfig.json')

module.exports = (data) => {
  console.log('Logger', data)

  let text = ''
  for (const [key, value] of Object.entries(data)) {
    text += `**${key}**: ${value}\n`
  }

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
  }
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'post',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}
