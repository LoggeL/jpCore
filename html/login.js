const urlParams = new URLSearchParams(window.location.search)
const getLocation = function (href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
};

const permissionMap = {
    "IDENTIFY": "Deine Daten einzusehen",
    "MODIFY": "Deine Daten zu bearbeiten"
}

const service = urlParams.get('service')
const hostname = new URL("https://" + service).hostname
document.getElementById('serviceText').innerText = hostname
if (!service) {
    alert("Dienst nicht richtig konfiguriert (service parameter missing)")
    //window.location = document.referrer
}

let token

const perms = urlParams.get('permissions').split(';')
const permissionsElement = document.getElementById('permissions')
let tokens = localStorage.getItem('tokens')
try {
    tokens = JSON.parse(tokens)
}
catch (e) {
    console.error('LocalStorageParseError', e)
    tokens = []
}

if (!tokens) tokens = []
else {
    const tokenObj = tokens.find(e => e.hostname === hostname && JSON.stringify(e.permissions) == JSON.stringify(perms))
    if (tokenObj) {
        // Already authed
        fetch('api/test', {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: tokenObj.token
            })
        }).then(async response => {
            const resp = await response.json()
            if (resp.error) {
                // Invalid Cached Token => Remove from Cache
                tokens.splice(tokens.indexOf(tokenObj), 1)
            }
            else if (resp.success) {
                // Valid Token, proceed login
                token = tokenObj.token
                const tokenSplit = token.split('.')
                const tokenInfoStr = atob(tokenSplit[1])
                const tokenInfo = JSON.parse(tokenInfoStr)

                document.getElementById('acceptName').innerText = `Angemeldet als: ${tokenInfo.name} (${tokenInfo.email})`

                document.getElementById('acceptForm').className = 'panel'
                document.getElementById('loginForm').className = 'hide panel'

                document.getElementById('accept').onclick = () => redirect(token)
            }
            else {
                console.error('Server Error from /api/test')
            }
        })
    }
}

if (perms) {
    permissionsElement.innerHTML = ''
    perms.forEach(p => {
        if (!permissionMap[p]) return
        const li = document.createElement('li')
        li.innerText = permissionMap[p]
        permissionsElement.append(li)
    })
}

const usernameElement = document.getElementById('usernameField')
const passwordElement = document.getElementById('passwordField')

const submitBtn = document.getElementById('submit')
const responseStatus = document.getElementById('responseStatus')

document.getElementById('submit').onclick = () => {
    const username = usernameElement.value
    const password = passwordElement.value

    if (!username) return console.log("No Username")
    if (!password) return console.log("No Password")

    console.log(window.location.host + '/api/login')

    fetch('api/login', {
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
        const resp = await response.json()
        if (resp.error) {
            responseStatus.innerText = resp.error
            submitBtn.className = 'btn red disabled'
            setTimeout(() => {
                responseStatus.innerText = ''
                submitBtn.className = 'btn blue'
            },
                3000
            )
        }
        else if (resp.success) {
            responseStatus.innerText = 'Angemeldet'
            submitBtn.className = 'btn green disabled'
            responseStatus.className = 'text-green margin-left'
            tokens.push({ hostname: hostname, token: resp.success, permissions: perms })

            localStorage.setItem('tokens', JSON.stringify(tokens))

            token = resp.success

            redirect(token)
        }
        else {
            responseStatus.innerText = "Serverfehler"
            submitBtn.className = 'btn red disabled'
            setTimeout(() => {
                responseStatus.innerText = ''
                submitBtn.className = 'btn blue'
            },
                3000
            )
        }
    })
}

function redirect(tkn) {
    window.location.href = 'http://' + service + '#' + tkn
}