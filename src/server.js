const express = require('express');
const app = express();
const cors = require('cors');

/**
 *  Middlewares
 */
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

// Use API routes
require('./routes')(app);

let port = process.env.PORT;

// Launch app
app.listen(port, () => {
    console.log("Running app on port " + port);
});