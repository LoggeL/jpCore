module.exports = (app, db) => {
  // Gets all free items
  app.get('/api/private/poolparty/item', async (req, res) => {
    try {
      const items = await db('item')
        .where('account_id', null)
        .select('id', 'name')
      res.status(200).json(items)
    } catch (error) {
      console.error('Error fetching items:', error)
      res.status(500).json({ error: error.message, text: 'Error fetching items' })
    }
  })
}
