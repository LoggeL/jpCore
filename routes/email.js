const nodemailer = require('nodemailer')

let transporter
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
} else {
  console.warn('SMTP_* env vars not set, email sending disabled')
}

module.exports = {
  sendMail: (receiver, data) => {
    if (!transporter) {
      console.warn('Email not sent (no transporter configured):', receiver)
      return
    }
    require('./email/sendMail.js')(receiver, data, transporter)
  },
}
