module.exports = (app, db) => {

    app.get('/api/private/poolparty/me', async (req, res) => {
        const userID = req.jwt._id
        try {
            const item = await db('item').where('account_id', userID).select('*')
            const volunteer = await db('volunteer').where('account_id', userID).select('*')
            const registration = await db('volunteer').where('account_id', userID).select('*')
            res.status(200).json({ item, volunteer, registration })
        } catch (error) {
            res.status(500).json({ error, text: "Error fetching information" })
        }
    })
}