const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient

const conString = 'mongodb+srv://master-yoda:ketamine@cluster0.37jpr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority';

// Set ejs engine
app.set('view engine', 'ejs')

/**
 *  Middlewares
 */
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('public'))
app.use(bodyParser.json())

// Create server for browser to connect to
app.listen(3000, () => {
    console.log('Listening on port 3000')
})

// Connect to MongoDB
// Using promises instead of callbacks
MongoClient.connect(conString, {useUnifiedTopology: true})
    .then(client => {
        console.log('Connected to Database')

        // Change the database
        const db = client.db('star-wars-quotes')

        // Create a collection
        const quotesCollection = db.collection('quotes')

        /**
         * Request handlers
         */

         // Handle GET requests
        app.get('/', (req, res) => {
            db.collection('quotes').find().toArray()
                .then(results => {
                    res.render('index.ejs', { quotes: results})
                    console.log(results) // for debugging
                })
                .catch(error => console.error(error))
            
        })

        // Handle POST requests
        app.post('/quotes', (req, res) => {
            quotesCollection.insertOne(req.body)
                .then(result => {
                    console.log(result)

                    // Redirect back to form
                    res.redirect('/')
                })
                .catch(error => console.error(error))
        })

        // Handle PUT requests
        app.put('/quotes', (req, res) => {
            quotesCollection.findOneAndUpdate(
                { name: 'Yoda'},
                {
                    $set: {
                        name: req.body.name,
                        quote: req.body.quote
                    }
                },
                {
                    upsert: true
                }
            )
                .then(_ => {
                    res.json('Success') // Send back to request
                })
                .catch(error => console.error(error))
        })

    })
    .catch(error => console.error(error))

