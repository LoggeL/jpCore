module.exports = (receiver, data, transporter) => {
  console.log('SentMail', receiver, data)

  data.from = 'poolparty@jupeters.de'
  data.to = receiver

  // Temporary suspend Mail sending

  transporter.sendMail(data, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}
