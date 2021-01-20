var mysql   = require('mysql');

require('dotenv').config()

var config = {
  connectionLimit: 400,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  // charset : 'utf8mb4_unicode_ci'
};

/*
 * @sqlConnection
 * Creates the connection, makes the query and close it to avoid concurrency conflicts.
 */
var sqlConnection = function sqlConnection(sql, values, next) {

    // It means that the values hasnt been passed
    if (arguments.length === 2) {
        next = values;
        values = null;
    }

    var connection = mysql.createConnection(config);
    connection.connect(function(err) {
        if (err !== null) {
            console.log("[MYSQL] Error connecting to mysql:" + err+'\n');
        }
    });

    connection.query(sql, values, function(err) {

        connection.end(); // close the connection

	console.log("Connection killed");

        if (err) {
            throw err;
        }

        // Execute the callback
        next.apply(this, arguments);
    });
}

module.exports = { query: sqlConnection };

