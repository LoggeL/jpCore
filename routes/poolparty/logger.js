const fetch = require('node-fetch')
const ifttt = require('ifttt')

module.exports = (data) => {
    const jsonData = {
        value1: data.event,
        value2: data.name,
        value3: data.item
    }
    fetch(ifttt.url, {
        method: "post",
        body: JSON.stringify(jsonData)
    })
}