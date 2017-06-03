var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

http.listen(Number(process.argv[3]), process.argv[2], function() {
  console.log('listening on ' + process.argv[2] + ':' + process.argv[3]);
});

app.use('/css', express.static(path.join('client', 'css')));
app.use('/js', express.static(path.join('client', 'js')));
app.use('/img', express.static(path.join('client', 'img')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'client', 'splash.html'));
});

var colors = [
  '#FFFFFF', // white
  '#ED1C24', // red
  '#333399', // blue
  '#00A550', // green
  '#FFEF00'  // yellow
]

var rooms = {};
var grid_w = 75;
var grid_h = 40;
var grid_state = [];
for(var i = 0; i < grid_w; i++) {
  grid_state[i] = [];
  for(var j = 0; j < grid_h; j++) {
    grid_state[i][j] = colors[0];
  }
}

var player1 = {
  id: '1',
  x: Math.floor(Math.random() * grid_w),
  y: Math.floor(Math.random() * grid_h),
  color: colors[1],
  dir: Math.floor(Math.random() * 4)
}

var player2 = {
  id: '2',
  x: Math.floor(Math.random() * grid_w),
  y: Math.floor(Math.random() * grid_h),
  color: colors[2],
  dir: Math.floor(Math.random() * 4)
}

var player3 = {
  id: '3',
  x: Math.floor(Math.random() * grid_w),
  y: Math.floor(Math.random() * grid_h),
  color: colors[3],
  dir: Math.floor(Math.random() * 4)
}

var player4 = {
  id: '4',
  x: Math.floor(Math.random() * grid_w),
  y: Math.floor(Math.random() * grid_h),
  color: colors[4],
  dir: Math.floor(Math.random() * 4)
}

var players = [
  player1,
  player2,
  player3,
  player4
];

var center_w = Math.floor(grid_w / 2);
var center_h = Math.floor(grid_h / 2);
drawRectObstacle(center_w - 8, center_h - 4, 16, 8);

setInterval(function() {
  // var x = Math.floor(Math.random() * grid_w);
  // var y = Math.floor(Math.random() * grid_h);
  player1.dir = Math.floor(Math.random() * 4);
  player2.dir = Math.floor(Math.random() * 4);
  player3.dir = Math.floor(Math.random() * 4);
  player4.dir = Math.floor(Math.random() * 4);
  
  players.forEach(function(player) {
    update_position(player);
    grid_state[player.x][player.y] = player.color;
  });
  io.sockets.emit('snapshot', {
    grid_state: grid_state,
    players: players
  });
}, 100);

function update_position(player) {
  if(player.dir == 0) {
    // UP
    if(playerCanBe(player.x, player.y - 1, player.color)) player.y -= 1;
  } else if(player.dir == 1) {
    // RIGHT
    if(playerCanBe(player.x + 1, player.y, player.color)) player.x += 1;
  } else if(player.dir == 2) {
    // DOWN
    if(playerCanBe(player.x, player.y + 1, player.color)) player.y += 1;
  } else {
    // LEFT
    if(playerCanBe(player.x - 1, player.y, player.color)) player.x -= 1;
  }
}

function playerCanBe(x, y, color) {
  if(!posInBounds(x,y)) return false;
  if(posColor(x,y) != colors[0] && posColor(x,y) != color) return false;
  return true;
}

function posInBounds(x, y) {
  if(x < 0 || x >= grid_w) return false;
  if(y < 0 || y >= grid_h) return false;
  return true;
}

function posColor(x, y) {
  return grid_state[x][y];
}

function drawRectObstacle(x, y, w, h) {
  for(var i = x; i < x + w; i++) {
    for(var j = y; j < y + h; j++) {
      grid_state[i][j] = '#686868';
    }
  }
}

io.sockets.on('connection', function(client) {
  // var room;
  // var player;
  // var update_loop;
  
  console.log('a user has connected');
  
  var player = {
    id: client.id,
    x: Math.floor(Math.random() * grid_w),
    y: Math.floor(Math.random() * grid_h),
    color: colors[Math.floor((Math.random() * (colors.length - 1)) + 1)],
    dir: Math.floor(Math.random() * 4)
  }
  
  players.push(player);
  
  client.emit('snapshot_start', grid_state);
  
  client.on('direction', function(dir) {
    player.dir = dir;
  });
  
  client.on('disconnect', function() {
    console.log('a user has disconnected');
    var index = players.indexOf(player);
    players.splice(index, 1);
    // if(room !== undefined) {
    //   leaveRoom(room, player);
    // }
    // room = undefined;
    // clearInterval(update_loop);
  });
  
  client.on('message', function(msg) {
    // console.log('player ' + msg.player_name + ' has connected to room '
    //             + msg.room_code);
    // player = msg.player_name.toString();
    // room = msg.room_code.toString();
    // joinRoom(room, player);
    // socket.join(room);
  });
  
  // update_loop = setInterval(function() {
  //   if(room !== undefined) {
  //     console.log('Sending data to room ' + room);
  //     var data = [];
  //     var color = Math.floor((Math.random() * 4));
  //     var x = Math.floor((Math.random() * 75));
  //     var y = Math.floor((Math.random() * 40));
  //     data.push({x: x, y: y, color: color});
  //     io.sockets.to(room).emit('update', data);
  //   }
  // }, 10);
  
  function joinRoom(room_name, player_name) {
    if(room_name in rooms) {
      // Add player to room
      rooms[room_name].players.push(player_name);
      rooms[room_name].size = rooms[room_name].players.length;
    } else {
      // Create new room and add player
      rooms[room_name] = {
        players: [player_name],
        size: 1
      };
    }
  }
  
  function leaveRoom(room_name, player_name) {
    if(room_name in rooms) {
      rooms[room_name].players = 
        rooms[room_name].players.filter(function(elem) {
          elem != player_name;
      });
      rooms[room_name].size = rooms[room_name].players.length;
    }
  }
});
