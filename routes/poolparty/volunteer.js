module.exports = (app, db) => {
    // Gets all free items
    app.post('/api/private/poolparty/volunteer', async (req, res) => {

        const userID = req.jwt.id
        if (!userID) return res.status(500).json({ error: "Missing UserID" })

        const duration = req.body.duration
        if (!duration) return res.status(400).json({ error: "No duration provided" })

        try {
            const registered = await db('registration').where('account_id', userID)
            if (!registered) return res.status(400).json({ error: 'Not yet registered' })

            const alreadyVolunteer = await db('volunteer').where('account_id', userID)
            if (alreadyVolunteer.length > 0) return res.status(400).json({ error: 'Already registered as volunteer' })

            await db('volunteer').insert({
                account_id: userID,
                duration,
                lastActivity: Date.now()
            })

            res.status(200).json({ success: "Successfully registered" })

        } catch (error) {
            res.status(500).json({ error, text: "Error during registration" })
        }

    })

    app.delete('/api/private/poolparty/volunteer', async (req, res) => {

        const userID = req.jwt.id
        if (!userID) return res.status(500).json({ error: "Missing UserID" })

        try {
            const response = await db('volunteer').where('account_id', userID).del()
            res.status(200).json(response)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error, text: "Error deleting item" })
        }
    })

}