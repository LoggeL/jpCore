module.exports = (app, db) => {
    app.get('/api/public/poolparty/', function (req, res) {
        res.send('Public');
    });

    app.get('/api/private/poolparty/', function (req, res) {
        res.send('Private');
    });
}