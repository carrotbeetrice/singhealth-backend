const crypto = require('crypto');

module.exports = class User {
    constructor(name, email, password, role, institution) {
        this.name = name;
        this.email = email;
        this.salt = crypto.randomBytes(16).toString('hex');
        this.hash = this.setPassword(password);
        this.role = role;
        this.institution = parseInt(institution);
        this.is_active;
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

// module.exports = {
//     User
// }

// cons../pgpoolUserSchema = mongoose.Schema({
//     name: {
//         type: String,
//         required: true
//     },
//     email: {
//         type: String,
//         required: true
//     },
//     hash: String,
//     salt: String
// });


// UserSchema.methods.setPassword = (password) => {
//     // Create unique salt for user
//     this.salt = crypto.randomBytes(16).toString('hex');

//     // Hashing user's salt and password with 1000 iterations
//     this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
// };


// UserSchema.methods.validPassword = (password) => {
//     var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
//     return this.hash === hash;
// };

// const User = module.exports = mongoose.model('User', UserSchema);