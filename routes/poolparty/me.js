module.exports = (app, db) => {
  app.get('/api/private/poolparty/me', async (req, res) => {
    const userID = req.jwt.id
    try {
      const item = await db('item')
        .where('account_id', userID)
        .select('name', 'id')
        .first()
      const volunteer = await db('volunteer')
        .where('account_id', userID)
        .select('duration', 'lastActivity')
        .first()
      const registration = await db('registration')
        .where('account_id', userID)
        .select('people', 'lastActivity', 'music')
        .first()

      res.status(200).json({
        item: item || null,
        volunteer: volunteer || null,
        registration: registration || null,
      })
    } catch (error) {
      console.error('Error fetching user info:', error)
      res.status(500).json({ error: error.message, text: 'Error fetching information' })
    }
  })
}
