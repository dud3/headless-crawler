var mysql = require('mysql');

var con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'p@$$w0rD',
  database: 'extractor',
  charset : 'utf8mb4_unicode_ci'
})

con.connect();

export default con;
