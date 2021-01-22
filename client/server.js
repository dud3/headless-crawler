const path = require("path");

const express = require("express");
const app = express();
const port = 3001;

app.set("port", port);

let http = require("http").Server(app);

app.get("/http-client-core", (req, res) => {
  res.sendFile(path.resolve("./http.html"));
});

app.get("/extracts", (req, res) => {
  res.sendFile(path.resolve("./extracts.html"));
});

app.get("/socket-client", (req, res) => {
  res.sendFile(path.resolve("./socket.html"));
});

app.get("/readability", (req, res) => {
  res.sendFile(path.resolve("./readability.html"));
});

const server = http.listen(port, function() {
  console.log("listening on *:" + port);
});
