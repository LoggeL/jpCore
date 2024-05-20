const nodemailer = require('nodemailer')
const mailConfig = require('./email/mailConfig.json')

const transporter = nodemailer.createTransport(mailConfig)

module.exports = {
  sendMail: (receiver, data) =>
    require('./email/sendMail.js')(receiver, data, transporter),
}
