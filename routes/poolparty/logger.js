const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn('TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID env vars not set, Telegram logging disabled')
}

module.exports = (data) => {
  console.log('Logger', data)

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return

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
