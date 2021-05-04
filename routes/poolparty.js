module.exports = (app, db) => {
    require('./poolparty/item.js')(app, db)
    require('./poolparty/volunteer.js')(app, db)
    require('./poolparty/registration.js')(app, db)

    require('./poolparty/admin.js')(app, db)
    require('./poolparty/me.js')(app, db)
}