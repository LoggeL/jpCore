module.exports = {
    registrationSuccessful: (data) => ({
        "subject": `Deine Poolparty Anmeldung!`,
        "text": `Hi ${data.name}!\nDies ist die Bestätigung für deine Anmeldung zur Poolparty!\nDu willst folgendens mitbringen: ${data.itemName}.\nWir freuen uns auf dich!\nDein Poolparty-Team`
    })
    unregistrationSuccessful: (data) => ({
        "subject": `Deine Poolparty Abmeldung!`,
        "text": `Hi ${data.name}!\nDies ist die Bestätigung für deine Abmeldung von unserer Poolparty!\nSchade dass du nicht kommen kannst (und wir uns nun selbst um: ${data.itemName} kümmern müssen.\nWir hoffen, dich nächstes Jahr wieder zu sehen!\nDein Poolparty-Team`
    })
    volunteerSuccessful: (data) => ({
        "subject": `Deine Poolparty Volunteer-Anmeldung!`,
        "text": `Hi ${data.name}!\nVielen Dank, dass du uns helfen wirst!\nDu kannst im Zeitraum: #loggehiereinfügen \nWir planen fest mit dir!\nDein Poolparty-Team`
    })
    unvolunteerSuccessful: (data) => ({
        "subject": `Deine Poolparty Volunteer-Abmeldung!`,
        "text": `Hi ${data.name}!\nSchade, dass du uns doch nicht helfen kannst!\nDa wird dir wohl das Helferpaket flöten gehen...\nDein Poolparty-Team`
    })
}
