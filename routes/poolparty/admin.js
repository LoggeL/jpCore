module.exports = (app, db) => {

    // Admin GET Route
    // Gets all accounts
    app.get('/api/admin/poolparty/account', async (req, res) => {
        db('account').select('id', 'name', 'email', 'verifiedMail', 'roles', 'lastActivity').then(account => {
            res.status(200).json(account)
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error fetching account" })
        })
    })

    // Gets all registrations
    app.get('/api/admin/poolparty/registration', async (req, res) => {
        db('registration').leftJoin('account', 'account.id', 'registration.account_id').select('registration.id', 'account.name', 'registration.people', 'registration.lastActivity', 'registration.music').then(registration => {
            res.status(200).json(registration)
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error fetching registration" })
        })
    })


    // Gets all items
    app.get('/api/admin/poolparty/item', async (req, res) => {
        db('item').leftJoin('account', 'item.account_id', 'account.id').select('item.id', 'item.name as itemName', 'account.name as accountName', 'item.lastActivity').then(item => {
            res.status(200).json(item)
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error fetching items" })
        })
    })

    // Gets all volunteers
    app.get('/api/admin/poolparty/volunteer', async (req, res) => {
        db('volunteer').leftJoin('account', 'account.id', 'volunteer.account_id').select('volunteer.id', 'account.name', 'volunteer.duration', 'volunteer.lastActivity').then(volunteer => {
            res.status(200).json(volunteer)
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error fetching volunteers" })
        })
    })

    // Admin POST Route
    // Adds an item
    app.post('/api/admin/poolparty/item', async (req, res) => {
        const name = req.body.name
        if (!name) return res.status(400).json({ error: "Missing name" })
        db('item').insert({ name }).then(response => {
            res.status(200).json({ success: "Added item" })
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error adding item" })
        })
    })

    // Admin DELETE Route
    // Removes an item
    app.delete('/api/admin/poolparty/item/:id', async (req, res) => {
        const id = req.params.id
        if (!id) return res.status(400).json({ error: "Missing item identifier" })
        db('item').where('id', id).del().then(response => {
            res.status(200).json({ success: "Removed item" })
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error deleting item" })
        })
    })

    // Removes a volunteer
    app.delete('/api/admin/poolparty/volunteer', async (req, res) => {
        const id = req.body.id
        if (!id) return res.status(400).json({ error: "Missing volunteer identifier" })
        db('volunteer').where('id', id).del().then(response => {
            res.status(200).json(response)
        }).catch(error => {
            console.error(error)
            res.status(500).json({ error, text: "Error deleting item" })
        })
    })

    // Removes a registration
    app.delete('/api/admin/poolparty/registration', async (req, res) => {
        const id = req.body.id
        try {

            if (!id) return res.status(400).json({ error: "Missing registration identifier" })
            const registration = await db('registration').where('id', id)
            if (!registration) return res.status(404).json({ error: "No registration found" })
            const account_id = registration[0].account_id
            await db('volunteer').where('account_id', account_id).del()
            await db('item').where('account_id', account_id).update({ account_id: null })
            const response = await db('registration').where('account_id', account_id).del()

            res.status(200).json(response)
        } catch (error) {
            console.error(error)
            res.status(500).json({ error, text: "Error deleting item" })
        }
    })
}