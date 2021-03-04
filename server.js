const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const userRoutes = require('./routes/userRoutes');
const userDb = require('./models/userModel');

/**
 *  Middlewares
 */
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Use API routes
app.use('/users', userRoutes);

let port = process.env.PORT || 3000;

// Launch app
app.listen(port, () => {
    console.log("Running app on port " + port);
})

/**
 * Default API response - for development only!
 */
app.get('/', (req, res) => {
    res.json({
       not_obi_wan: "Hello there",
       not_grievous: "GENERAL KENOBI"
    });
});
