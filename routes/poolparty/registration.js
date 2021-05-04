module.exports = (app, db) => {

    // Gets registers account
    app.post('/api/private/poolparty/registration', async (req, res) => {
        const userID = req.jwt._id
        if (!userID) return res.status(500).json({ error: "Missing UserID" })

        const people = req.body.personen
        if (!people) return res.status(400).json({ error: "Missing people count" })
        if (people < 1 || people > 4) return res(403).json({ error: "Invalid people count" })

        const itemID = req.body.itemID
        if (!itemID) return res.status(400).json({ error: "Missing itemID" })

        try {
            const registered = await db('registration').where('account_id', userID)
            if (registered) return res.send(400).json({ error: 'Already registered' })

            const item = await db('item').where('id', itemID)
            if (!item) return res.send(400).json({ error: 'Invalid item' })
            if (item[0].account_id) return res.send(400).json({ error: 'Item already claimed' })

            await db('registration').insert({
                account_id: userID,
                people,
                lastActivity: Date.now()
            })

            await db('item').where('id', itemID).update({ account_id: userID })
            res.status(200).json({ success: true })

        } catch (error) {
            res.status(500).json({ error, text: "Error during registration" })
        }
    })
}