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

let token = localStorage.getItem('token')

if (token) {
    // Already authed
    fetch('api/private/test', {
        method: "get",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': token
        }
    }).then(async response => {
        const resp = await response.json()
        if (resp.error) {
            // Invalid Cached Token => Remove from Cache
            localStorage.removeItem('token')
        }
        else if (resp.success) {
            // Valid Token, proceed login
            const tokenSplit = token.split('.')
            const tokenInfoStr = atob(tokenSplit[1])
            const tokenInfo = JSON.parse(tokenInfoStr)

            document.getElementById('acceptName').innerText = `Angemeldet als: ${tokenInfo.name} (${tokenInfo.email})`

            document.getElementById('acceptForm').className = 'panel'
            document.getElementById('loginForm').className = 'hide panel'
            const deny = document.getElementById('deny')
            deny.classList.remove('hide')
            deny.onclick = () => {
                localStorage.removeItem('token')
                window.location.reload()
            }

            document.getElementById('accept').onclick = () => redirect(token)
        }
        else {
            console.error('Server Error from /api/test')
        }
    })
}

const usernameElement = document.getElementById('usernameField')
const passwordElement = document.getElementById('passwordField')

const submitBtn = document.getElementById('submit')
const responseStatus = document.getElementById('responseStatus')
const loginForm = document.getElementById('loginForm')

loginForm.onsubmit = (e) => {
    e.preventDefault()

    const username = usernameElement.value
    const password = passwordElement.value

    if (!username) return console.log("Nutzername fehlt")
    if (!password) return console.log("Passwort fehlt")

    fetch('api/public/login', {
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

            localStorage.setItem('token', resp.success)

            redirect(resp.success)
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
    const service = "poolparty.jupeters.de"
    window.location.href = 'http://' + service + '#' + tkn
}