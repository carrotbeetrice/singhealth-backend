const Pool = require('pg').Pool;
require('dotenv').config();

var pool;
const config = {
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: process.env.DB_PORT,
    idleTimeoutMillis: 30000
};

module.exports = {
    getPool: () => {
        if (pool) return pool;
        pool = new Pool(config);
        return pool;
    }
};