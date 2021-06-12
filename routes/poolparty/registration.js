const email = require('../email.js')
const mailTemplates = require('../email/mailTemplates.js')
const logger = require('./logger.js')

module.exports = (app, db) => {

    // Registers account
    app.post('/api/private/poolparty/registration', async (req, res) => {
        const userID = req.jwt.id
        if (!userID) return res.status(500).json({ error: "Missing UserID" })

        const people = req.body.people
        if (!people) return res.status(400).json({ error: "Missing people count" })
        if (people < 1 || people > 4) return res(403).json({ error: "Invalid people count" })

        const itemID = req.body.itemID
        if (!itemID) return res.status(400).json({ error: "Missing itemID" })

        try {
            const registered = await db('registration').where('account_id', userID)
            if (registered == true) return res.status(400).json({ error: 'Already registered' })

            const item = await db('item').where('id', itemID)
            if (!item) return res.status(400).json({ error: 'Invalid item' })
            if (item[0].account_id) return res.status(400).json({ error: 'Item already claimed' })

            await db('registration').insert({
                account_id: userID,
                people,
                lastActivity: Date.now()
            })

            await db('item').where('id', itemID).update({ account_id: userID })

            const emailData = await db('account').where('id', userID).select('email', 'name')
            email.sendMail(emailData[0].email,
                mailTemplates.registrationSuccessful({
                    name: emailData[0].name,
                    itemName: item[0].name
                })
            )
            logger({
                event: "registered",
                name: emailData[0].name,
                itemName: item[0].name
            })

            return res.status(200).json({ success: true })
        } catch (error) {
            console.error(error)
            return res.status(500).json({ error, text: "Error during registration" })
        }
    })

    // Removes a registration
    app.delete('/api/private/poolparty/registration', async (req, res) => {
        const id = req.jwt.id
        try {
            if (!id) return res.status(400).json({ error: "Missing registration identifier" })
            const registration = await db('registration').where('account_id', id)
            if (registration.length == 0) return res.status(404).json({ error: "No registration found" })
            await db('volunteer').where('account_id', id).del()
            await db('item').where('account_id', id).update({ account_id: null })
            await db('registration').where('account_id', id).del()

            const userData = await db('account').where('id', id).select('name')
            const itemData = await db('item').where('account_id', id).select('name')
            logger({
                event: "removed registered",
                name: userData[0].name,
                itemName: itemData[0].name
            })

            res.status(200).json({ success: "Sucessfully unregistered" })
        } catch (error) {
            console.error(error)
            res.status(500).json({ error, text: "Error deleting item" })
        }
    })
}