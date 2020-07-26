const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));

const poolpartyAnmeldungen = new PouchDB('db/Poolparty/Anmeldungen')
const poolpartyItems = new PouchDB('db/Poolparty/Items')
const poolpartyVolunteers = new PouchDB('db/Poolparty/Volunteers')

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
                }).catch(error => res.status(500).json({ error: String(error), text: "Error resolving promises" }))

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
                    return res.status(200).json({ success: 'Operation successful', data: items })
                }).catch(error => res.status(500).json({ error: String(error), text: "Error loadding Items" }))
                break

            case "ladeNutzer":
                const userID = req.jwt._id
                const items = poolpartyItems.find({
                    selector: { userID: userID },
                    fields: ['name', '_id', 'date', '_rev']
                })
                const anmeldung = poolpartyAnmeldungen.find({
                    selector: { userID: userID },
                    fields: ['personen', '_id', 'date', '_rev']
                })
                const volunteer = poolpartyVolunteers.find({
                    selector: { userID: userID },
                    fields: ['dauer', '_id', 'date', '_rev']
                })
                Promise.all([items, anmeldung, volunteer]).then(([item, anmeldung, volunteer]) => {
                    return res.status(200).json(
                        {
                            success: 'Operation successful',
                            data: {
                                anmeldung: anmeldung.docs,
                                item: item.docs,
                                volunteer: volunteer.docs,
                            }
                        })
                }).catch(error => res.status(500).json({ error: String(error), text: "Error loadding Data from Database" }))
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
                            res.status(503).json({ error: String(error), text: "Error inserting into databse" })
                        )
                }).catch(error =>
                    res.status(503).json({ error: String(error), text: "Error inserting into databse" })
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
                        res.status(503).json({ error: String(error), text: "Error inserting into databse" })
                    )
                break
            case "volunteerAbmelden":
                const volunteerID = req.body.volunteerID
                if (!volunteerID) return res.status(400).json({ error: "Missing ID" })

                const volunteerRev = req.body.volunteerRev
                if (!volunteerRev) return res.status(400).json({ error: "Missing Revision" })

                poolpartyVolunteers.remove({ _id: volunteerID, _rev: volunteerRev }).then(() =>
                    res.status(200).json({ success: "Erfolgreich abgemeldet" })
                )
                    .catch(error =>
                        res.status(503).json({ error: String(error), text: "Error deleting from databse" })
                    )
                break

            case "anmeldungAbmelden":
                const anmeldungID = req.body.anmeldungID
                if (!anmeldungID) return res.status(400).json({ error: "Missing ID" })

                const anmeldungRev = req.body.anmeldungRev
                if (!anmeldungRev) return res.status(400).json({ error: "Missing Revision" })

                const itemID2 = req.body.itemID
                if (!itemID2) return res.status(400).json({ error: "Missing itemID" })

                const itemRev = req.body.itemRev
                if (!itemRev) return res.status(400).json({ error: "Missing itemRev" })

                const itemName = req.body.itemName
                if (!itemName) return res.status(400).json({ error: "Missing itemName" })

                const item = poolpartyItems.put({
                    _id: itemID2,
                    _rev: itemRev,
                    userID: null,
                    name: itemName,
                    date: Date.now()
                })

                const anmeldung = poolpartyAnmeldungen.remove({ _id: anmeldungID, _rev: anmeldungRev })

                Promise.all(item, anmeldung).then(() =>
                    res.status(200).json({ success: "Erfolgreich abgemeldet" })
                )
                    .catch(error =>
                        res.status(503).json({ error: String(error), text: "Error deleting from databse" })
                    )
                break

            default:
                res.status(404).json({ error: "Method not found" })
        }
    });
}