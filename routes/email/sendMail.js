module.exports = (receiver, data, transporter) => {
  data.from = 'poolparty@jupeters.de'
  data.to = receiver

  transporter.sendMail(data, (error, info) => {
    if (error) {
      console.error('Email send error:', error)
    } else {
      console.log('Email sent:', info.response)
    }
  })
}
