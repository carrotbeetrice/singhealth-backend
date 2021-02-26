const updateButton = document.querySelector('#update-button')
const deleteButton = document.querySelector('#delete-button')
const messageDiv = document.querySelector('#message')

// Default data to send back
const data = {
    name: 'Darth Vader',
    quote: 'I have a son!'
}

/**
 * PUT
 */
updateButton.addEventListener('click', _ => {
    fetch('/quotes', {
        method: 'put',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
        .then(res => {
            if (res.ok) return res.json()
        })
        .then(response => {
            console.log(response)
            window.location.reload(true)
        })
        .catch(err => console.error(err))
})

/**
 * DELETE
 */
deleteButton.addEventListener('click', _ => {
    fetch('/quotes', {
        method: 'delete',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            name: 'Anakin Skywalker'
        })
    })
        .then(res => {
            if (res.ok) return res.json()
        })
        .then(response => {
            console.log(response)
            if (response === 'No Anakin quotes left to delete') {
                messageDiv.textContent = response
            } else {
                window.location.reload()
            }
        })
        .catch(err => console.log(err))
})