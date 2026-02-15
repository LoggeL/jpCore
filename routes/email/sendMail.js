// Legacy compatibility — redirects to main email module
const email = require('../email.js')

module.exports = (receiver, data) => {
  email.sendMail(receiver, data)
}
