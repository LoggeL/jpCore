module.exports = (app, db) => {
  app.get('/api/private/poolparty/me', async (req, res) => {
    const userID = req.jwt.id
    try {
      const item = await db('item').where('account_id', userID).select('name')
      const volunteer = await db('volunteer')
        .where('account_id', userID)
        .select('duration', 'lastActivity')
      const registration = await db('registration')
        .where('account_id', userID)
        .select('people', 'lastActivity', 'music')
      res.status(200).json({
        item: item ? item[0] : null,
        volunteer: volunteer ? volunteer[0] : null,
        registration: registration ? registration[0] : null,
      })
    } catch (error) {
      res
        .status(500)
        .json({ error: error.message, text: 'Error fetching information' })
    }
  })
}
