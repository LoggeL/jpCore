module.exports = {
    registrationSuccessful: (data) => ({
        "subject": `Deine Poolparty Anmeldung!`,
        "text": `Hi ${data.name}!\nDies ist die Bestätigung für deine Anmeldung zur Poolparty!\nDu willst folgendens mitbringen: ${data.itemName}.\nWir freuen uns auf dich!\nDein Poolparty-Team`
    })
}