import * as socketio from "socket.io";
import core from "./core";

const port = 3001
const express = require('express')
const app = express();
app.set("port", port);

let http = require("http").Server(app);
let io = require("socket.io")(http, {
  cors: {
    origin: '*', // note: for now any origin allowed
  }
});

app.use(function(req: any, res: any, next: any) {
  res.header("Access-Control-Allow-Origin", "*"); // note: for now any origin allowed
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

io.on("connection", async (socket: any) => {
  console.log("Socket connection set.");

  socket.on("send-url", async (url: any) => {
    console.log("on: send-url: " + url);

    const cbs: Record<string, any> = {
      'request-blocked': (request: any) => { console.log(request.url); socket.emit("request-blocked", { url: request.url, type: request.type }); },
      'script-injected': (script: string, url: string) => {},
      'browser-tab-closed': () => { socket.emit('browser-tab-closed'); }
    }

    await core.main(url, cbs, 8000, true);
  });
});

http.listen(port, function() {
  console.log("Server listening on *:" + port);
});
