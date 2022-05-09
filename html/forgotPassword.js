const forgotPassword = document.getElementById('forgotPassword')
const responseStatus = document.getElementById('responseStatus')
const submitBtn = document.getElementById('submit')
const loginForm = document.getElementById('loginForm')
const usernameElement = document.getElementById('usernameField')
const passwordField = document.getElementById('passwordField')

let resetToken

try {
    resetToken = window.location.href.split('=')[1]
    // Decode JWT Payload
    const tokenSplit = resetToken.split('.')
    const tokenInfoStr = atob(tokenSplit[1])
    const tokenInfo = JSON.parse(tokenInfoStr)

    usernameElement.value = tokenInfo.email
    usernameElement.setAttribute('disabled', true)

    passwordField.parentElement.style.display = 'block'
    submitBtn.innerText = 'Passwort setzen'
}
catch (e) {
    console.error('Invalid Token')
}


loginForm.onsubmit = (e) => {

    e.preventDefault()

    const email = usernameElement.value

    if (!email) return console.log("Email fehlt")

    if (resetToken) {
        const password = passwordField.value

        if (!password) return console.log("Passwort fehlt")

        fetch('api/public/resetPassword', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: resetToken,
                password: password
            })
        }).then(async resp => {
            if (resp.status === 200) {
                responseStatus.innerText = 'Passwort wurde geändert'
                responseStatus.className = 'text-green margin-left'

                setTimeout(() => {
                    window.location.href = 'login.html'
                }, 2000)
            }
            else {
                const error = await resp.json()
                responseStatus.innerText = 'Passwort konnte nicht geändert werden: ' + error.error
                responseStatus.className = 'text-red margin-left'
            }
        })
    }
    else {
        submitBtn.classList.add('disabled')
        fetch('api/public/sendPasswordReset', {
            method: "post",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email
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
                responseStatus.innerText = 'Passwort wurde an ' + email + ' gesendet'
                submitBtn.className = 'btn green disabled'
                responseStatus.className = 'text-green margin-left'
                setTimeout(() => {
                    responseStatus.innerText = ''
                    submitBtn.className = 'btn blue'
                    window.location.href = 'login.html'
                },
                    3000
                )
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
        }).catch(e => {
            responseStatus.innerText = "Serverfehler"
            submitBtn.className = 'btn red disabled'
            setTimeout(() => {
                responseStatus.innerText = ''
                submitBtn.className = 'btn blue'
            },
                3000
            )
            console.error(e)
        })
    }
}

