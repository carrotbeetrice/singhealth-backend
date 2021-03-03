// let router = require('express').Router();
// let User = require('../models/userModel');

// /**
//  * User login
//  */
// router.post('/login', (req, res) => {
//     // Find user with requested email
//     User.findOne({ email: req.body.email }, (err, user) => {
//         if (user === null) {
//             return res.status(400).send({
//                 message: "User not found"
//             });
//         } else if (user.validPassword(req.body.password)) {
//             return res.status(201).send({
//                 message: "Login successful"
//             });
//         } else {
//             return res.status(400).send({
//                 message: "Wrong password"
//             })
//         }
//     })
// });

// /**
//  * User signup - should this be allowed?
//  */
// router.post('/signup', (req, res, next) => {
//     let newUser = new User();

//     newUser.name = req.body.name;
//     newUser.email = req.body.email;
//     newUser.password = req.body.password;

//     // Hash password
//     newUser.setPassword(req.body.password);

//     // Save to database
//     newUser.save((err, User) => {
//         if (err) {
//             return res.status(400).send({
//                 message: "Failed to register user"
//             });
//         } else {
//             return res.status(201).send({
//                 message: "User registration successful"
//             });
//         }
//     });
// });

// module.exports = router;