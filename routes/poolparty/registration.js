const email = require('../email.js')
const mailTemplates = require('../email/mailTemplates.js')
const logger = require('./logger.js')

module.exports = (app, db) => {
  // Registers account
  app.post('/api/private/poolparty/registration', async (req, res) => {
    const userID = req.jwt.id
    if (!userID) return res.status(500).json({ error: 'UserID fehlt' })

    const people = req.body.people
    if (!people) return res.status(400).json({ error: 'Personenanzahl fehlt' })
    if (people < 1 || people > 2)
      return res(403).json({ error: 'Unzulässige Personenanzahl' })

    const itemID = req.body.itemID
    if (!itemID) return res.status(400).json({ error: 'ItemID fehlt' })

    const music = req.body.music

    try {
      const registered = await db('registration')
        .where('account_id', userID)
        .first()
      if (registered)
        return res.status(400).json({ error: 'Account bereits registriert' })

      const item = await db('item').where('id', itemID)
      if (!item) return res.status(400).json({ error: 'Item nicht gefunden' })
      if (item[0].account_id)
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
      email.sendMail(
        emailData[0].email,
        mailTemplates.registrationSuccessful({
          name: emailData[0].name,
          itemName: item[0].name,
        })
      )
      logger({
        event: 'registered',
        name: emailData[0].name,
        itemName: item[0].name,
        people,
        music,
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error, text: 'Fehler beim Registrieren' })
    }
  })

  // Removes a registration
  app.delete('/api/private/poolparty/registration', async (req, res) => {
    const id = req.jwt.id
    try {
      if (!id)
        return res
          .status(400)
          .json({ error: 'Missing registration identifier' })
      const registration = await db('registration').where('account_id', id)
      if (registration.length == 0)
        return res.status(404).json({ error: 'No registration found' })
      await db('volunteer').where('account_id', id).del()
      const itemData = await db('item').where('account_id', id).select('name')
      const item = await db('item')
        .where('account_id', id)
        .update({ account_id: null })
      console.log(item)
      await db('registration').where('account_id', id).del()

      const userData = await db('account')
        .where('id', id)
        .select('name', 'email')

      email.sendMail(
        userData[0].email,
        mailTemplates.unregistrationSuccessful({
          name: userData[0].name,
          itemName: itemData[0].name,
        })
      )
      logger({
        event: 'removed registered',
        name: userData[0].name,
        itemName: itemData[0].name,
      })

      res.status(200).json({ success: 'Erfolgreich entfernt' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ error, text: 'Fehler beim Entfernen' })
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
        registration.itemID = oldItem.id
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

      console.log(updateData)
      console.log(updateFields)
      console.log(changedFields)
      console.log(registration)
      console.log(oldItem)

      if (updateData.itemID !== undefined && updateData.itemID != oldItem.id) {
        const item = await db('item').where('id', updateData.itemID).first()
        if (!item) return res.status(400).json({ error: 'Unzulässige ItemID' })
        if (item.account_id)
          return res.status(400).json({ error: 'Item bereits vergeben' })

        updateFields.itemID = updateData.itemID
        changedFields.itemID_old = oldItem.id
        changedFields.itemID_new = updateData.itemID

        await db('item')
          .where('account_id', userID)
          .update({ account_id: null })
        await db('item')
          .where('id', updateData.itemID)
          .update({ account_id: userID })
      }

      if (updateFields.people < 1 || updateFields.people > 2) {
        return res.status(403).json({ error: 'Unzulässige Personenanzahl' })
      }

      if (Object.keys(changedFields).length === 0) {
        return res.status(400).json({ error: 'Keine Änderungen vorgenommen' })
      }

      // Remove itemID from updateFields
      delete updateFields.itemID
      await db('registration').where('account_id', userID).update(updateFields)

      const emailData = await db('account')
        .where('id', userID)
        .select('email', 'name')

      email.sendMail(
        emailData[0].email,
        mailTemplates.registrationUpdate({
          name: emailData[0].name,
          updateFields,
        })
      )

      logger({
        event: 'updated registration',
        name: emailData[0].name,
        ...changedFields,
      })

      return res.status(200).json({ success: true, updateFields })
    } catch (error) {
      console.error(error)
      return res
        .status(500)
        .json({ error, text: 'Error updating registration' })
    }
  })
}
