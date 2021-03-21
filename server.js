const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const directoryRoutes = require('./routes/directoryRoutes');
const authRoutes = require('./routes/authRoutes');

/**
 *  Middlewares
 */
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Use API routes
app.use('/users', userRoutes);
app.use('/directory', directoryRoutes);
app.use('/auth', authRoutes);

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
