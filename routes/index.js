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
                    console.log(items.rows)
                    return res.status(200).json(
                        {
                            success: 'Operation successful',
                            data: {
                                anmeldungen: anmeldungen.rows.map(e => e.doc),
                                items: items.rows.map(e => e.doc),
                                volunteers: volunteers.rows.map(e => e.doc),
                                users: users.rows.map(e => e.doc).map(e => ({ _id: e._id, email: e.email, name: e.name, roles: e.roles, date: e.date, verifiedMail: e.verifiedMail }))
                            }
                        })
                }).catch(error => res.status(500).json({ error, text: "Error resolving promises" }))

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
                if (!name) return res.status(400).json({ error: "Missing Name" })
                console.log({
                    name,
                    userID: null,
                    date: Date.now()
                })
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
            case "removeElement":
                const _id = req.body._id
                if (!_id) return res.status(400).json({ error: "Missing ID" })

                const _rev = req.body._rev
                if (!_rev) return res.status(400).json({ error: "Missing Revision" })

                const element = req.body.element
                if (!element) return res.status(400).json({ error: "Missing Element" })

                let db
                switch (element) {
                    case "anmeldung":
                        db = poolpartyAnmeldungen
                        break
                    case "item":
                        db = poolpartyItems
                        break
                    case "volunteer":
                        db = poolpartyVolunteers
                        break
                    default:
                        console.log(element)
                        return res.status(404).json({ error: "Unbekannte Methode" })
                }
                db.remove({ _id, _rev }).then(() =>
                    res.status(200).json({ success: "Removed Item" })
                ).catch((error) =>
                    res.status(503).json({ text: "Error removing from databse", error })
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
                    const items = itemDocs.docs.map(e => ({ name: e.name, _id: e._id, _rev: e._rev }))
                    // ToDo format data
                    res.status(200).json({ success: 'Operation successful', data: items })
                }).catch(error => res.status(500).json({ error, text: "Error loadding Items" }))
                break
            default:
                res.status(404).json({ error: "Not found" })
        }
    });

    // USER POST
    let userID
    app.post('/api/private/poolparty/:method', function (req, res) {
        switch (req.params.method) {
            case "setzeAnmeldung":
                userID = null
                userID = req.body.userID
                console.log(req.body)
                if (!userID) return res.status(400).json({ error: "Keine UserID angegeben" })

                const personen = req.body.personen
                if (!personen) return res.status(400).json({ error: "Keine Personenzahl angegeben" })

                const itemID = req.body.itemID
                if (!itemID) return res.status(400).json({ error: "Keine ItemID angegeben" })

                poolpartyItems.get(itemID).then(doc => {
                    const item = poolpartyItems.put({
                        _id: itemID,
                        _rev: doc._rev,
                        userID,
                        name: doc.name,
                        date: Date.now()
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
                userID = null
                userID = req.body.userID
                if (!userID) return res.status(400).json({ error: "Keine UserID angegeben" })

                const dauer = req.body.dauer
                if (!dauer) return res.status(400).json({ error: "Keine Dauer angegeben" })

                poolpartyVolunteers.post({
                    userID, dauer, date: Date.now()
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