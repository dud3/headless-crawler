import { promises as fs } from 'fs';
import * as path from "path";

const express = require('express')
const app = express()
const port = 3010

app.set("port", port);

let http = require("http").Server(app);
let io = require("socket.io")(http);

app.get("/http-client-core", (req: any, res: any) => {
  res.sendFile(path.resolve("./client/test-http-server.html"));
});

app.get("/http-client-extracts", (req: any, res: any) => {
  res.sendFile(path.resolve("./client/test-http-extracts.html"));
});

app.get("/socket-client", (req: any, res: any) => {
  res.sendFile(path.resolve("./client/test-socket-server.html"));
});

const server = http.listen(port, function() {
  console.log("listening on *:" + port);
});
