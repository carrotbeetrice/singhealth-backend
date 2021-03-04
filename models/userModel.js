const crypto = require('crypto');

module.exports = class User {
    constructor(name, email, password, role, institution) {
        this.name = name;
        this.email = email;
        this.salt = crypto.randomBytes(16).toString('hex');
        this.hash = ((password === '') || (password === null)) ? '' : this.setPassword(password);
        this.role = role;
        this.institution = parseInt(institution);
    }

    /**
     * Set salt and hash password for the user
     * If y'all are interested to read more: https://auth0.com/blog/adding-salt-to-hashing-a-better-way-to-store-passwords/
     */
    setPassword = (password) => {
        var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
        return hash;
    };

/**
 * Check if entered password is correct
 */
    validPassword = (password) => {
            var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
            return this.hash === hash;
        };
};

