/* TODO
 * Check for host leaving a lobby.
 * Add leave lobby functionality.
 * Add start game functionality.
 */

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

// Default server setup.
http.listen(Number(process.argv[3]), process.argv[2], function() {
  console.log('listening on ' + process.argv[2] + ':' + process.argv[3]);
});

// Look for resources in these folders.
app.use('/css', express.static(path.join('client', 'css')));
app.use('/js', express.static(path.join('client', 'js')));
app.use('/img', express.static(path.join('client', 'img')));

// Send splash.html to new clients.
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Player colors and base tile color.
// Note: need to add gray as a color, but this requires some changes to other
// bits of code.
const COLORS = [
  '#FFFFFF',  // white
  '#ED1C24',  // red
  '#333399',  // blue
  '#00A550',  // green
  '#FFEF00',  // yellow
  '#686868'   // gray
];
const GRID_WIDTH = 75;  // Number of horizontal grid tiles.
const GRID_HEIGHT = 40; // Number of vertical grid tiles.
const MAX_PLAYERS = 4;  // Number of players allowed in room.
const GAME_TICK = 100;  // Milliseconds between server ticks.
const VIEW_WIDTH = 30;  // Number of horizontal grid tiles shown to player.
const VIEW_HEIGHT = 16; // Number of vertical grid tiles shown to player.

var rooms = {};         // List of currently created rooms.

class GameRoom {
  // Sets room name, grid width and height, sets all grid tiles to white,
  // creates the four "ai" players, and draw any obstacles.
  constructor(name) {
    this.name = name;
    this.grid_w = GRID_WIDTH;
    this.grid_h = GRID_HEIGHT;
    this.grid_state = [];
    this.game_interval;
    this.game_over = false;
    this.lobby = true;
  
    for(var i = 0; i < this.grid_w; i++) {
      this.grid_state[i] = [];
      for(var j = 0; j < this.grid_h; j++) {
        this.grid_state[i][j] = COLORS[0];
      }
    }
    
    // AI
    // Note: will be changed once lobbies are set up.
    // this.player1 = {
    //   id: '1',
    //   name: 'blinky',
    //   x: Math.floor(Math.random() * this.grid_w),
    //   y: Math.floor(Math.random() * this.grid_h),
    //   color: COLORS[1],
    //   dir: Math.floor(Math.random() * 4),
    //   score: 0
    // };
    
    // this.player2 = {
    //   id: '2',
    //   name: 'inky',
    //   x: Math.floor(Math.random() * this.grid_w),
    //   y: Math.floor(Math.random() * this.grid_h),
    //   color: COLORS[2],
    //   dir: Math.floor(Math.random() * 4),
    //   score: 0
    // };
    
    // this.player3 = {
    //   id: '3',
    //   name: 'pinky',
    //   x: Math.floor(Math.random() * this.grid_w),
    //   y: Math.floor(Math.random() * this.grid_h),
    //   color: COLORS[3],
    //   dir: Math.floor(Math.random() * 4),
    //   score: 0
    // };
    
    // this.player4 = {
    //   id: '4',
    //   name: 'clyde',
    //   x: Math.floor(Math.random() * this.grid_w),
    //   y: Math.floor(Math.random() * this.grid_h),
    //   color: COLORS[4],
    //   dir: Math.floor(Math.random() * 4)
    // };
    
    // Array of all players in the room.
    this.players = [
      // this.player1,
      // this.player2,
      // this.player3
      // this.player4
    ];
    
    // Draw obstacle in the center.
    this.center_w = Math.floor(this.grid_w / 2);
    this.center_h = Math.floor(this.grid_h / 2);
    this.drawRectObstacle(this.center_w - 8, this.center_h - 4, 16, 8);
    
    // Confirm that the AI don't spawn in a wall.
    // this.verifyPosition(this.player1);
    // this.verifyPosition(this.player2);
    // this.verifyPosition(this.player3);
    // this.verifyPosition(this.player4);
  }
  
  // Start the game loop and game timer.
  startGame() {
    console.log("starting game: " + this.name);
    this.game_interval = setInterval(this.updateGame.bind(this), GAME_TICK);
    this.startTimer();
    io.to(this.name).emit('snapshot_start', this.roomState);
  }
  
  // Main game loop for this room. Gets put into a setInterval function.
  updateGame() {
    if(!this.game_over) {
      // Give AI random move directions.
      // this.player1.dir = Math.floor(Math.random() * 4);
      // this.player2.dir = Math.floor(Math.random() * 4);
      // this.player3.dir = Math.floor(Math.random() * 4);
      // this.player4.dir = Math.floor(Math.random() * 4);
      
      // Update each of the player positions based on direction.
      this.players.forEach(function(player) {
        this.updatePosition(player);
        this.updateScore(player);
        // this.grid_state[player.x][player.y] = player.color;
      }, this);
      
      // Tell each of the clients in the room.
      io.to(this.name).emit('snapshot', this.roomState);
    }
  }
  
  // Updates player's position based on direction, but will ensure player does
  // not go where he is not supposed to go.
  updatePosition(player) {
    if(player.dir == 0) {
      // UP
      if(this.playerCanBe(player.x, player.y - 1, player.color)) player.y -= 1;
    } else if(player.dir == 1) {
      // RIGHT
      if(this.playerCanBe(player.x + 1, player.y, player.color)) player.x += 1;
    } else if(player.dir == 2) {
      // DOWN
      if(this.playerCanBe(player.x, player.y + 1, player.color)) player.y += 1;
    } else {
      // LEFT
      if(this.playerCanBe(player.x - 1, player.y, player.color)) player.x -= 1;
    }
  }
  
  // Checks a position (x,y) and returns true if a player (color) can go to it.
  playerCanBe(x, y, color) {
    if(!this.posInBounds(x,y)) return false;
    if(this.posColor(x,y) != COLORS[0] && this.posColor(x,y) != color) {
      return false;
    }
    return true;
  }
  
  // Checks if a position (x,y) is inside the bounds of the grid.
  posInBounds(x, y) {
    if(x < 0 || x >= this.grid_w) return false;
    if(y < 0 || y >= this.grid_h) return false;
    return true;
  }
  
  // Returns the color of a grid square.
  posColor(x, y) {
    return this.grid_state[x][y];
  }
  
  // Update grid tile and if it changes, add to player's score.
  updateScore(player) {
    if(this.grid_state[player.x][player.y] != player.color) {
      this.grid_state[player.x][player.y] = player.color;
      player.score += 1;
    }
  }
  
  // Draws a rectangular obstacle on the board.
  drawRectObstacle(x, y, w, h) {
    for(var i = x; i < x + w; i++) {
      for(var j = y; j < y + h; j++) {
        this.grid_state[i][j] = COLORS[5];
      }
    }
  }
  
  // Update room state.
  update() {
    if(this.lobby) {
      io.to(this.name).emit('lobby_update', this.players);
    }
  }
  
  createPlayer(id, player_name) {
    var player = {
      id: id,
      name: player_name,
      x: Math.floor(Math.random() * GRID_WIDTH),
      y: Math.floor(Math.random() * GRID_HEIGHT),
      color: COLORS[this.size + 1],
      dir: Math.floor(Math.random() * 4),
      score: 0,
      host: this.size == 0,
      ready: false
    };
    return player;
  }
  
  // Adds a player to the GameRoom.
  addPlayer(player) {
    if(this.size < MAX_PLAYERS) {
      this.verifyPosition(player);
      this.players.push(player);
      io.to(this.name).emit('lobby_update', this.players);
    }
  }
  
  // Removes a player from the GameRoom (if he exists).
  removePlayer(player) {
    var index = this.players.indexOf(player);
    if(index >= 0) {
      this.players.splice(index, 1);
    }
    if(this.lobby) {
      io.to(this.name).emit('lobby_update', this.players);
    }
    if(this.players.length <= 0) {
      destroyRoom(this.name);
    }
  }
  
  // Make sure player does not spawn in a wall.
  verifyPosition(player) {
    while(!this.playerCanBe(player.x, player.y, player.color)) {
      player.x = Math.floor(Math.random() * GRID_WIDTH);
      player.y = Math.floor(Math.random() * GRID_HEIGHT);
    }
  }
  
  // Start game timer.
  startTimer() {
    this.game_time = 20;
    this.game_timer = setInterval(this.updateTimer.bind(this), 1000);
  }
  
  // Update game timer.
  updateTimer() {
    if(this.game_time !== undefined) {
      this.game_time -= 1;
      if(this.game_time <= 0) {
        this.gameOver();
      }
    }
  }
  
  // Stop and clear timer.
  stopTimer() {
    clearInterval(this.game_timer);
    this.game_time = 0;
  }
  
  // End the game.
  gameOver() {
    this.game_over = true;
    this.stopTimer();
    console.log(this.name + ": Game Over.");
    io.to(this.name).emit('game_over', this.roomState);
  }
  
  destroyRoom() {
    clearInterval(this.game_interval);
  }
  
  // Number of players in the room.
  get size() {
    return this.players.length;
  }
  
  // State of the room.
  get roomState() {
    var state = {};
    state.grid_state = this.grid_state;
    state.players = this.players;
    state.grid_w = GRID_WIDTH;
    state.grid_h = GRID_HEIGHT;
    state.view_w = VIEW_WIDTH;
    state.view_h = VIEW_HEIGHT;
    state.game_time = this.game_time;
    return state;
  }
}

// Things related to a new connection.
io.sockets.on('connection', function(client) {
  console.log('Client connection received. IP: '
              + client.handshake.address);
  
  var room;   // Player's room name.
  var player; // Player object.
  
  // Remove player from room when he disconnects.
  client.on('disconnect', function() {
    console.log('Client disconnected. IP: '
                + client.request.connection.remoteAddress);
    if(room !== undefined) {
      leaveRoom(room, player);
    }
  });
  
  // Request to join a room.
  client.on('join_room', function(data) {
    var player_name = data.player_name.toString();
    var room_code = data.room_code.toString();
    
    console.log('Player ' + player_name + ' is connecting to room '
                + room_code + '.');
    
    // Connect player to room if possible, otherwise send error.
    ifJoinRoom(room_code, player_name);
  });
  
  // Create a new room if possible.
  client.on('create_room', function(data) {
    var player_name = data.player_name.toString();
    var room_code = data.room_code.toString();
    
    console.log('Creating room. Name: ' + room_code);
    
    if(createRoom(room_code)) {
      ifJoinRoom(room_code, player_name);
    } else {
      client.emit('could_not_create_room');
    }
  });
  
  // Update player's ready state.
  client.on('player_ready', function(is_ready) {
    if(player !== undefined) {
      player.ready = is_ready;
      updateRoom(room);
    }
  });
  
  // Update player's direction.
  client.on('direction', function(dir) {
    if(player !== undefined) {
      player.dir = dir;
    }
  });
  
  client.on('start_game', function() {
    if(player !== undefined && player.host) {
      startGame(room);
    }
  });
  
  // Join a room if possible.
  function ifJoinRoom(room_name, player_name) {
    if(canJoinRoom(room_name)) {
      room = room_name;
      player = createPlayer(room, client.id, player_name);
      client.join(room);
      // Add player to room
      joinRoom(room, player);
      // Notify client
      client.emit('joined_room', player);
    } else {
      client.emit('could_not_join_room');
    }
  }
});

// Create a player object with a given id.
function createPlayer(room_name, id, player_name) {
  if(room_name in rooms) {
    return rooms[room_name].createPlayer(id, player_name);
  }
}

// Checks if the room exists and has an open spot.
function canJoinRoom(room_name) {
  return (room_name in rooms) && (rooms[room_name].size < MAX_PLAYERS);
}

// Create a new room.
function createRoom(room_name) {
  if(!(room_name in rooms)) {
    rooms[room_name] = new GameRoom(room_name);
    return true;
  }
  return false;
}

// Destroy a room.
function destroyRoom(room_name) {
  if(room_name in rooms) {
    rooms[room_name].destroyRoom();
    delete rooms[room_name];
  }
}

// Add a player to a specific room.
function joinRoom(room_name, player) {
  if(canJoinRoom(room_name)) {
    rooms[room_name].addPlayer(player);
  }
}

// Tell a room that there is an update.
function updateRoom(room_name) {
  if(room_name in rooms) {
    rooms[room_name].update();
  }
}

function startGame(room_name) {
  if(room_name in rooms) {
    rooms[room_name].startGame();
  }
}

// Remove a player from a room.
function leaveRoom(room_name, player) {
  if(room_name in rooms) {
    rooms[room_name].removePlayer(player);
  }
}
