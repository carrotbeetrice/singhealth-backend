const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    hash: String,
    salt: String
});

/**
 * Set salt and hash password for the user
 * If y'all are interested to read more: https://auth0.com/blog/adding-salt-to-hashing-a-better-way-to-store-passwords/
 */
UserSchema.methods.setPassword = (password) => {
    // Create unique salt for user
    this.salt = crypto.randomBytes(16).toString('hex');

    // Hashing user's salt and password with 1000 iterations
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

/**
 * Check if entered password is correct
 */
UserSchema.methods.validPassword = (password) => {
    var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
    return this.hash === hash;
};

const User = module.exports = mongoose.model('User', UserSchema);