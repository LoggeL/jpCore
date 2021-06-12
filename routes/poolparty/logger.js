const fetch = require('node-fetch')
const ifttt = require('./ifttt.json')

module.exports = (data) => {

    console.log('Logger', data)

    const jsonData = {
        value1: data.event,
        value2: data.name,
    }
    fetch(ifttt.url, {
        method: "post",
        body: JSON.stringify(jsonData),
        headers: { "Content-Type": "application/json" }
    })
}