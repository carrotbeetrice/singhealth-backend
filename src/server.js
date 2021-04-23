const express = require('express');
const app = express();
const cors = require('cors');
const email = require('./services/email/sendEmail'); // test only

// Middlewares
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

// Use API routes
require('./routes')(app);
// app.use('/mail', email.sendTenantReport); // test only

let port = process.env.PORT;

// Launch app
app.listen(port, () => {
    console.log("Running app on port " + port);
});