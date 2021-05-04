module.exports = (app, db) => {

    // Gets all free items
    app.get('/api/private/poolparty/item', (req, res) => {
        db('item').where('account_id', null).select('*').then(item => {
            res.status(200).json(item)
        }).catch(error => {
            res.status(500).json({ error, text: "Error fetching items" })
        })
    })

}