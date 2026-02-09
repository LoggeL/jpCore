const email = require('../email.js')
const mailTemplates = require('../email/mailTemplates.js')
const logger = require('./logger.js')

module.exports = (app, db) => {
  // Registers account
  app.post('/api/private/poolparty/registration', async (req, res) => {
    const userID = req.jwt.id
    if (!userID) return res.status(500).json({ error: 'UserID fehlt' })

    const { people, itemID, music } = req.body
    if (!people) return res.status(400).json({ error: 'Personenanzahl fehlt' })
    if (people < 1 || people > 2)
      return res.status(403).json({ error: 'Unzulässige Personenanzahl' })
    if (!itemID) return res.status(400).json({ error: 'ItemID fehlt' })

    try {
      const registered = await db('registration')
        .where('account_id', userID)
        .first()
      if (registered)
        return res.status(400).json({ error: 'Account bereits registriert' })

      const item = await db('item').where('id', itemID).first()
      if (!item) return res.status(400).json({ error: 'Item nicht gefunden' })
      if (item.account_id)
        return res.status(400).json({ error: 'Item bereits vergeben' })

      await db('registration').insert({
        account_id: userID,
        people,
        lastActivity: Date.now(),
        music,
      })

      await db('item').where('id', itemID).update({ account_id: userID })

      const emailData = await db('account')
        .where('id', userID)
        .select('email', 'name')
        .first()

      if (emailData) {
        email.sendMail(
          emailData.email,
          mailTemplates.registrationSuccessful({
            name: emailData.name,
            itemName: item.name,
          })
        )
      }

      logger({
        event: 'registered',
        name: emailData ? emailData.name : 'unknown',
        itemName: item.name,
        people,
        music: music || '',
      })

      return res.status(200).json({ success: 'Erfolgreich registriert' })
    } catch (error) {
      console.error('Error in registration:', error)
      return res.status(500).json({ error: error.message, text: 'Fehler beim Registrieren' })
    }
  })

  // Removes a registration
  app.delete('/api/private/poolparty/registration', async (req, res) => {
    const id = req.jwt.id
    try {
      if (!id)
        return res.status(400).json({ error: 'Missing registration identifier' })

      const registration = await db('registration').where('account_id', id).first()
      if (!registration)
        return res.status(404).json({ error: 'No registration found' })

      await db('volunteer').where('account_id', id).del()
      const itemData = await db('item').where('account_id', id).select('name').first()
      await db('item').where('account_id', id).update({ account_id: null })
      await db('registration').where('account_id', id).del()

      const userData = await db('account')
        .where('id', id)
        .select('name', 'email')
        .first()

      if (userData && itemData) {
        email.sendMail(
          userData.email,
          mailTemplates.unregistrationSuccessful({
            name: userData.name,
            itemName: itemData.name,
          })
        )
        logger({
          event: 'removed registered',
          name: userData.name,
          itemName: itemData.name,
        })
      }

      res.status(200).json({ success: 'Erfolgreich entfernt' })
    } catch (error) {
      console.error('Error removing registration:', error)
      res.status(500).json({ error: error.message, text: 'Fehler beim Entfernen' })
    }
  })

  // Modifies a registration
  app.patch('/api/private/poolparty/registration', async (req, res) => {
    const userID = req.jwt.id
    if (!userID) return res.status(500).json({ error: 'UserID fehlt' })

    const updateData = req.body
    if (!updateData)
      return res.status(400).json({ error: 'Keine Daten zum Updaten' })

    try {
      const registration = await db('registration')
        .where('account_id', userID)
        .first()
      if (!registration)
        return res.status(404).json({ error: 'Keine Registrierung gefunden' })

      const validUpdateFields = ['people', 'music', 'itemID']
      const updateFields = {}
      const changedFields = {}

      let oldItem
      if (updateData.itemID !== undefined) {
        oldItem = await db('item').where('account_id', userID).first()
        registration.itemID = oldItem ? oldItem.id : null
      }

      for (const field of validUpdateFields) {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field]
          if (updateData[field] != registration[field]) {
            changedFields[field + '_old'] = registration[field]
            changedFields[field + '_new'] = updateData[field]
          }
        }
      }

      if (changedFields.itemID_old && changedFields.itemID_new) {
        const item = await db('item')
          .where('id', updateData.itemID)
          .select('name')
          .first()
        changedFields.itemID_old = `${oldItem.name} (${oldItem.id})`
        changedFields.itemID_new = `${item.name} (${updateData.itemID})`
      }

      if (updateData.itemID !== undefined && oldItem && updateData.itemID != oldItem.id) {
        const item = await db('item').where('id', updateData.itemID).first()
        if (!item) return res.status(400).json({ error: 'Unzulässige ItemID' })
        if (item.account_id)
          return res.status(400).json({ error: 'Item bereits vergeben' })

        await db('item').where('account_id', userID).update({ account_id: null })
        await db('item').where('id', updateData.itemID).update({ account_id: userID })
      }

      if (updateFields.people !== undefined && (updateFields.people < 1 || updateFields.people > 2)) {
        return res.status(403).json({ error: 'Unzulässige Personenanzahl' })
      }

      if (Object.keys(changedFields).length === 0) {
        return res.status(400).json({ error: 'Keine Änderungen vorgenommen' })
      }

      // Remove itemID from updateFields (not a DB column on registration)
      delete updateFields.itemID
      if (Object.keys(updateFields).length > 0) {
        await db('registration').where('account_id', userID).update(updateFields)
      }

      const emailData = await db('account')
        .where('id', userID)
        .select('email', 'name')
        .first()

      if (emailData) {
        email.sendMail(
          emailData.email,
          mailTemplates.registrationUpdate({
            name: emailData.name,
            changedFields,
          })
        )
      }

      logger({
        event: 'updated registration',
        name: emailData ? emailData.name : 'unknown',
        ...changedFields,
      })

      return res.status(200).json({ success: 'Erfolgreich aktualisiert' })
    } catch (error) {
      console.error('Error updating registration:', error)
      return res.status(500).json({ error: error.message, text: 'Error updating registration' })
    }
  })
}
