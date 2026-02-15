const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

if (!resend) {
  console.warn('RESEND_API_KEY not set, email sending disabled')
}

const FROM = process.env.EMAIL_FROM || 'Poolparty <poolparty@logge.top>'

module.exports = {
  sendMail: async (receiver, data) => {
    if (!resend) {
      console.warn('Email not sent (no Resend API key):', receiver)
      return
    }
    try {
      const result = await resend.emails.send({
        from: FROM,
        to: receiver,
        subject: data.subject,
        html: data.html || undefined,
        text: data.text || undefined,
      })
      console.log('Email sent:', result)
    } catch (error) {
      console.error('Email send error:', error)
    }
  },
}
