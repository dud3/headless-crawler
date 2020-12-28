require('dotenv').config()

var mysql = require('mysql');

// note: after creating the user (in my case remoteuser0) execute the following:
// execute ALTER USER 'remoteuser0'@'%' IDENTIFIED WITH mysql_native_password BY 'password'
// otherwise the code below will fail

var con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: 3306,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset : 'utf8mb4_unicode_ci'
})

con.connect((err) => {
  if (err) throw err;

  console.log('Connected to the MySQL server.');
});

export default con;
