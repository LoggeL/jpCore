const urlParams = new URLSearchParams(window.location.search)
const getLocation = function (href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
};

const permissionMap = {
    "IDENTIFY": "Deine Daten einzusehen",
    "MODIFY": "Deine Daten zu bearbeitetn"
}

const service = urlParams.get('service')
document.getElementById('serviceText').innerText = getLocation(service).hostname
if (!service) {
    alert("Dienst nicht richtig konfiguriert (service parameter missing)")
    window.location = document.referrer
}

const perms = urlParams.get('permissions')
const permissionsElement = document.getElementById('permissions')

if (perms) {
    permissionsElement.innerHTML = ''
    perms.split(";").forEach(p => {
        if (!permissionMap[p]) return
        const li = document.createElement('li')
        li.innerText = permissionMap[p]
        permissionsElement.append(li)
    })
}

const usernameElement = document.getElementById('usernameField')
const passwordElement = document.getElementById('passwordField')

document.getElementById('submit').onclick = () => {
    const username = usernameElement.value
    const password = passwordElement.value

    if (!username) return console.log("No Username")
    if (!password) return console.log("No Password")

    console.log(window.location.host + '/api/login')

    fetch('http://localhost:3000/api/login', {
        method: "post",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: username,
            password: password
        })
    }).then(async response => {
        console.log(await response.text())
    })
}