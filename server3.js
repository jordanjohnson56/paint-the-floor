//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'canvas.html')));
var players = [];
var sockets = [];

io.on("connection", function(socket){
  
  socket.emit('welcomeMessage', 'Welcome, you are connected to the server');
  
});

server.listen(process.argv[3] || process.env.PORT || 8080, process.argv[2] || process.env.IP || "http://troy-mayjor.c9users.io", function(){
  var addr = server.address();
  console.log("Game server listening at", addr.address + ":" + addr.port);
});