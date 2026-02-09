const nodemailer = require('nodemailer')

let transporter
try {
  const mailConfig = require('./email/mailConfig.json')
  transporter = nodemailer.createTransport(mailConfig)
} catch {
  console.warn('mailConfig.json not found, email sending disabled')
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
