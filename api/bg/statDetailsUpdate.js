const dbSql = require('./../db-sql');

(async (req, res) => {
  const errors = {
    ERR_NAME_NOT_RESOLVED:                `update extracts set errorCode = 0 where error like '%Error: net::ERR_NAME_NOT_RESOLVED%';`,
    ERR_CONNECTION_REFUSED:               `update extracts set errorCode = 1 where error like '%Error: net::ERR_CONNECTION_REFUSED%';`,
    ERR_ABORTED:                          `update extracts set errorCode = 2 where error like '%ERR_ABORTED%';`,
    ERR_SSL_PROTOCOL_ERROR:               `update extracts set errorCode = 3 where error like '%ERR_SSL_PROTOCOL_ERROR%';`,
    ERR_SSL_VERSION_OR_CIPHER_MISMATCH:   `update extracts set errorCode = 4 where error like '%ERR_SSL_VERSION_OR_CIPHER_MISMATCH%';`,
    ERR_TIMED_OUT:                        `update extracts set errorCode = 5 where error like '%ERR_TIMED_OUT%';`,
    ERR_CONNECTION_CLOSED:                `update extracts set errorCode = 6 where error like '%ERR_CONNECTION_CLOSED%';`,
    ERR_CONNECTION_RESET:                 `update extracts set errorCode = 7 where error like '%ERR_CONNECTION_RESET%';`
  };

  let i = Object.keys(errors).length;

  for (const key in errors) {
    await dbSql.query(errors[key], (err, r) => {
      console.log(err, r);
      i--;
      if (i == 0) { process.exit(); }
    });
  }
})();
