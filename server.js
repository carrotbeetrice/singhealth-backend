const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const userRoutes = require('./routes/userRoutes');
const mongoose = require('mongoose');

/**
 *  Middlewares
 */
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Use API routes
app.use('/api/user', userRoutes);

/**
 * Constants
 */
let port = process.env.PORT || 3000;
let conString = 'mongodb+srv://carrot:LUeoQCrd4JIJhg0G@cluster0.jsegz.mongodb.net/singhealth-backend?retryWrites=true&w=majority'; // TODO: Set connection string as environment variable
let options = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}

// Launch app
app.listen(port, () => {
    console.log("Running app on port " + port);
})

// Connect to MongoDB
mongoose.connect(conString, options)
    .then(_ => {
        console.log("Connected to database");
    }, err => {
        console.error(err);
    });

/**
 * Default API response - for development only!
 */
app.get('/', (req, res) => {
    res.json({
       not_obi_wan: "Hello there",
       not_grievous: "GENERAL KENOBI"
    });
});




