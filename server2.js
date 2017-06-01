var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

http.listen(Number(process.argv[3]), process.argv[2], function() {
  console.log('listening on ' + process.argv[2] + ':' + process.argv[3]);
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/client/splash.html');
});

io.on('connection', function(socket) {
  console.log('a user has connected');
  
  socket.on('disconnect', function() {
    console.log('a user has disconnected');
  });
  
  socket.on('message', function(msg) {
    console.log('player ' + msg.player_name + ' has connected to room '
                + msg.room_code);
  });
});
