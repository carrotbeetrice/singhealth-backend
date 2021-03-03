const Pool = require('pg').Pool;
require('dotenv').config();

const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DB_PORT
});

/**
 * CRUD operations
 */

const getConnection = (callback) => {
    return pool.getConnection(callback);
};

const getUsers  = (req, res) => {
    pool.query(`SELECT * FROM Users`, (err, results) => {
        if (err) throw err;
        res.status(200).json(results.rowsCount);
    });
};

const getUserById = (req, res) => {
    const id = parseInt(req.params.id);

    pool.query("SELECT * FROM users WHERE id = $1", [id], (err, results) => {
        if (err) throw err;
        res.status(200).json(results.rows);
    });
};

const createUser = (req, res) => {
    const {name, email} = req.body;

    pool.query("INSERT INTO users (name, email) VALUES ($1, $2)", [name, email], (err, results) => {
        if (err) throw err;
        res.status(201).send("User added with ID: ${result.id}");
    });
};

module.exports  = {
    pool,
    getUsers,
    getUserById,
    createUser
}