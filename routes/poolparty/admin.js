module.exports = (app, db) => {
  // Gets all accounts
  app.get('/api/admin/poolparty/account', async (req, res) => {
    try {
      const accounts = await db('account')
        .select('id', 'name', 'email', 'verifiedMail', 'roles', 'lastActivity')
      res.status(200).json(accounts)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      res.status(500).json({ error: error.message, text: 'Error fetching account' })
    }
  })

  // Gets all registrations
  app.get('/api/admin/poolparty/registration', async (req, res) => {
    try {
      const registrations = await db('registration')
        .leftJoin('account', 'account.id', 'registration.account_id')
        .select(
          'registration.id',
          'account.name',
          'registration.people',
          'registration.lastActivity',
          'registration.music'
        )
      res.status(200).json(registrations)
    } catch (error) {
      console.error('Error fetching registrations:', error)
      res.status(500).json({ error: error.message, text: 'Error fetching registration' })
    }
  })

  // Gets all items
  app.get('/api/admin/poolparty/item', async (req, res) => {
    try {
      const items = await db('item')
        .leftJoin('account', 'item.account_id', 'account.id')
        .select(
          'item.id',
          'item.name as itemName',
          'account.name as accountName',
          'item.lastActivity'
        )
      res.status(200).json(items)
    } catch (error) {
      console.error('Error fetching items:', error)
      res.status(500).json({ error: error.message, text: 'Error fetching items' })
    }
  })

  // Gets all volunteers
  app.get('/api/admin/poolparty/volunteer', async (req, res) => {
    try {
      const volunteers = await db('volunteer')
        .leftJoin('account', 'account.id', 'volunteer.account_id')
        .select(
          'volunteer.id',
          'account.name',
          'volunteer.duration',
          'volunteer.lastActivity'
        )
      res.status(200).json(volunteers)
    } catch (error) {
      console.error('Error fetching volunteers:', error)
      res.status(500).json({ error: error.message, text: 'Error fetching volunteers' })
    }
  })

  // Adds an item
  app.post('/api/admin/poolparty/item', async (req, res) => {
    try {
      const { name } = req.body
      if (!name) return res.status(400).json({ error: 'Missing name' })
      await db('item').insert({ name })
      res.status(200).json({ success: 'Added item' })
    } catch (error) {
      console.error('Error adding item:', error)
      res.status(500).json({ error: error.message, text: 'Error adding item' })
    }
  })

  // Removes an item
  app.delete('/api/admin/poolparty/item/:id', async (req, res) => {
    try {
      const { id } = req.params
      if (!id) return res.status(400).json({ error: 'Missing item identifier' })
      await db('item').where('id', id).del()
      res.status(200).json({ success: 'Removed item' })
    } catch (error) {
      console.error('Error deleting item:', error)
      res.status(500).json({ error: error.message, text: 'Error deleting item' })
    }
  })

  // Removes a volunteer
  app.delete('/api/admin/poolparty/volunteer/:id', async (req, res) => {
    try {
      const { id } = req.params
      if (!id) return res.status(400).json({ error: 'Missing volunteer identifier' })
      const response = await db('volunteer').where('id', id).del()
      res.status(200).json(response)
    } catch (error) {
      console.error('Error deleting volunteer:', error)
      res.status(500).json({ error: error.message, text: 'Error deleting item' })
    }
  })

  // Removes a registration
  app.delete('/api/admin/poolparty/registration/:id', async (req, res) => {
    try {
      const { id } = req.params
      if (!id) return res.status(400).json({ error: 'Missing registration identifier' })

      const registration = await db('registration').where('id', id).first()
      if (!registration) return res.status(404).json({ error: 'No registration found' })

      const { account_id } = registration
      await db('volunteer').where('account_id', account_id).del()
      await db('item').where('account_id', account_id).update({ account_id: null })
      const response = await db('registration').where('account_id', account_id).del()

      res.status(200).json(response)
    } catch (error) {
      console.error('Error deleting registration:', error)
      res.status(500).json({ error: error.message, text: 'Error deleting item' })
    }
  })
}
