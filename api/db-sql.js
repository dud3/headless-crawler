require('dotenv').config()

var mysql = require('mysql');

var con = mysql.createPool({
  connectionLimit: 400,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset : 'utf8mb4_unicode_ci'
})

// con.connect();
console.log("Mysql server started.")

module.exports = con;
