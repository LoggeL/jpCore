const logger = require('./logger.js')
const email = require('../email.js')
const mailTemplates = require('../email/mailTemplates.js')

module.exports = (app, db) => {
  // Register as volunteer
  app.post('/api/private/poolparty/volunteer', async (req, res) => {
    const userID = req.jwt.id
    if (!userID) return res.status(500).json({ error: 'Missing UserID' })

    const { duration } = req.body
    if (!duration)
      return res.status(400).json({ error: 'No duration provided' })

    try {
      const registered = await db('registration').where('account_id', userID).first()
      if (!registered)
        return res.status(400).json({ error: 'Not yet registered' })

      const alreadyVolunteer = await db('volunteer').where('account_id', userID).first()
      if (alreadyVolunteer)
        return res.status(400).json({ error: 'Already registered as volunteer' })

      await db('volunteer').insert({
        account_id: userID,
        duration,
        lastActivity: Date.now(),
      })

      const userData = await db('account')
        .where('id', userID)
        .select('email', 'name')
        .first()

      if (userData) {
        email.sendMail(
          userData.email,
          mailTemplates.volunteerSuccessful({
            name: userData.name,
            duration,
          })
        )
        logger({ event: 'volunteer', name: userData.name, duration })
      }

      res.status(200).json({ success: 'Successfully registered' })
    } catch (error) {
      console.error('Error registering volunteer:', error)
      res.status(500).json({ error: error.message, text: 'Error during registration' })
    }
  })

  // Remove volunteer
  app.delete('/api/private/poolparty/volunteer', async (req, res) => {
    const userID = req.jwt.id
    if (!userID) return res.status(500).json({ error: 'Missing UserID' })

    try {
      const response = await db('volunteer').where('account_id', userID).del()

      const userData = await db('account')
        .where('id', userID)
        .select('email', 'name')
        .first()

      if (userData) {
        email.sendMail(
          userData.email,
          mailTemplates.unvolunteerSuccessful({ name: userData.name })
        )
        logger({ event: 'removed volunteer', name: userData.name })
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Error deleting volunteer:', error)
      res.status(500).json({ error: error.message, text: 'Error deleting item' })
    }
  })
}
