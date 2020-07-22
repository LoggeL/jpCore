const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

const poolpartyAnmeldungen = new PouchDB('../db/Poolparty/Anmeldungen')
const poolpartyItems = new PouchDB('../db/Poolparty/Items')
const poolpartyVolunteers = new PouchDB('../db/Poolparty/Volunteers')

module.exports = (app, userDB) => {

    // Admin GET Route
    app.get('/api/admin/poolparty/:method', function (req, res) {
        switch (req.params.method) {
            case "ladeAnmeldungen":
                const anmeldungen = poolpartyAnmeldungen.allDocs({ include_docs: true })
                const items = poolpartyItems.allDocs({ include_docs: true })
                const volunteers = poolpartyVolunteers.allDocs({ include_docs: true })
                const users = userDB.allDocs({ include_docs: true })
                Promise.all([anmeldungen, items, volunteers, users]).then(([anmeldungen, items, volunteers, users]) => {
                    res.status(200).json(
                        {
                            success: 'Operation successful',
                            data: {
                                anmeldungen: anmeldungen.rows.map(e => e.doc),
                                items: items.rows.map(e => e.doc),
                                volunteers: volunteers.rows.map(e => e.doc),
                                users: users.rows.map(e => e.doc).map(e => ({ email: e.email, name: e.name, roles: e.roles, date: e.date, verifiedMail: e.verifiedMail }))
                            }
                        })
                }).catch(error => res.status(500).json({ error }))

                break
            default:
                res.status(404).json({ error: "Not found" })
        }
    })

    // Admin POST Route
    app.post('/api/admin/poolparty/:method', function (req, res) {
        switch (req.params.method) {
            case "setzeItem":
                const name = req.body.name
                if (!name) res.send(400).json({ error: "Missing Name" })
                poolpartyItems.post({
                    name,
                    userID: null,
                    date: Date.now()
                }).then(() =>
                    res.status(200).json({ success: "Inserted " + name })
                ).catch((error) =>
                    res.status(503).json({ text: "Error inserting into databse", error })
                )
                break
            default:
                res.status(404).json({ error: "Not found" })
        }
    });

    // USER GET Route
    app.get('/api/private/poolparty/:method', function (req, res) {
        switch (req.params.method) {
            case "ladeItems":
                poolpartyItems.find({
                    selector: { userID: null },
                    fields: ['name', '_id']
                }).then(itemDocs => {
                    // ToDo format data
                    res.status(200).json({ success: 'Operation successful', data: itemDocs })
                }).catch(error => res.status(500).json({ error }))
                break
            default:
                res.status(404).json({ error: "Not found" })
        }
    });

    // USER POST  
    app.post('/api/private/poolparty/:method', function (req, res) {
        switch (req.params.method) {
            case "setzeAnmeldung":
                userID = req.body.userID
                if (!userID) res.send(400).json({ error: "Keine UserID angegeben" })

                const personen = req.body.personen
                if (!personen) res.send(400).json({ error: "Keine Personenzahl angegeben" })

                const itemID = req.body.itemID
                if (!itemID) res.send(400).json({ error: "Keine ItemID angegeben" })

                poolpartyItems.get(itemID).then(doc => {
                    const item = poolpartyItems.put({
                        _id: itemID,
                        _rev: doc._rev,
                        userID
                    })
                    const anmeldung = poolpartyAnmeldungen.post({
                        userID, itemID, personen, date: Date.now()
                    })
                    Promise.all([item, anmeldung])
                        .then(() =>
                            res.status(200).json({ success: "Erfolgreich angemeldet" })
                        )
                        .catch(error =>
                            res.status(503).json({ error, text: "Error inserting into databse" })
                        )
                }).catch(error =>
                    res.status(503).json({ error, text: "Error inserting into databse" })
                )
                break
            case "setzeVolunteer":
                const userID = req.body.userID
                if (!userID) res.send(400).json({ error: "Keine UserID angegeben" })

                const duration = req.body.duration
                if (!duration) res.send(400).json({ error: "Keine Dauer angegeben" })

                poolpartyVolunteers.post({
                    userID, duration, date: Date.now()
                })
                    .then(() =>
                        res.status(200).json({ success: "Erfolgreich angemeldet" })
                    )
                    .catch(error =>
                        res.status(503).json({ error, text: "Error inserting into databse" })
                    )
                break
            default:
                res.status(404).json({ error: "Method not found" })
        }
    });
}