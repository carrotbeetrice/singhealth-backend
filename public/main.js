/**
 * Execute PUT and DELETE requests
 */
const updateButton = document.querySelector('#update-button')
const deleteButton = document.querySelector('#delete-button')

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
})

/**
 * DELETE
 */
deleteButton.addEventListener('click', _ => {
    fetch('/quotes', {
        method: 'delete',
    })
})