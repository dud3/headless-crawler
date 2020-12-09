var mysql = require('mysql');

var con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'p@$$w0rD',
  database: 'extractor'
})

con.connect();

export default con;
