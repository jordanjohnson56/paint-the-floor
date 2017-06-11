/* global io */
/* global $ */
$(function() {
  var socket = io();      // Client socket.
  
  var has_joined = false; // Has client joined a room?
  var canvas, c;          // Game canvas and context.
  var grid_w = 75;        // Number of horizontal grid tiles.
  var grid_h = 40;        // Number of vertical grid tiles.
  var view_w = 30;        // Number of horizontal grid tiles shown to player.
  var view_h = 16;        // Number of vertical grid tiles shown to player.
  var grid = [];          // Current state of the game board.
  var players = [];       // Current player stats.
  var can_render = false; // Has client received first snapshot?
  var my_id, my_player;   // Client's player id and associated object.

  // Resize the canvas when the window is resized.
  window.addEventListener('resize', resize);
  
  // Join room when player submits, if valid info is given.
  $('#join-room').submit(function(e) {
    e.preventDefault();
    var name_input = $('#player-name').val();
    var room_input = $('#room-code').val();
    if(!has_joined) {
      if(name_input != '') {
        if(room_input != '') {
          // Tell the server
          socket.emit('join_room', {
            player_name: name_input,
            room_code: room_input
          });
        } else {
          console.error('Please enter a room code.');
        }
      } else {
        console.error('Please enter a name.');
      }
    }
    return false;
  });
  
  // Create room when player submits, if valid info is given.
  $('#create-room').submit(function(e) {
    e.preventDefault();
    var name_input = $('#player-name').val();
    var room_input = $('#room-code').val();
    if(!has_joined) {
      if(name_input != '') {
        if(room_input != '') {
          // Tell the server
          socket.emit('create_room', {
            player_name: name_input,
            room_code: room_input
          });
        } else {
          showError('Please enter a room code.');
        }
      } else {
        showError('Please enter a name.');
      }
    }
    return false;
  });
  
  // Error returned when a room cannot be created.
  socket.on('could_not_create_room', function() {
    showError('Could not create room.');
  });
  
  // Error returned when a room cannot be joined.
  socket.on('could_not_join_room', function() {
    showError('Could not join room.');
  });
  
  // Notification that a room was successfully joined.
  socket.on('joined_room', function(player) {
    console.log('hello room');
    // Remove the join screen
    $('#join').remove();
    has_joined = true;
    
    my_id = player.id;

    // Create the canvas
    createCanvas();
    // Start the rendering loop
    window.requestAnimationFrame(draw);
  });
  
  // Latest game state from the server.
  // Includes grid state, player states (positions), as well as some metrics to
  // help prevent cheating.
  socket.on('snapshot', function(state) {
    getStateInfo(state);
  });
  
  // Initial game state from server which tells the client that it can start
  // rendering the game.
  socket.on('snapshot_start', function(state) {
    getStateInfo(state);
    can_render = true;
  });
  
  // Updates client's game state information based on server state.
  function getStateInfo(state) {
    grid = state.grid_state;
    players = state.players;
    
    // The best anti-cheat I can come up with.
    grid_w = state.grid_w;
    grid_h = state.grid_h;
    view_w = state.view_w;
    view_h = state.view_h;
    
    players.forEach(function(player) {
      if(player.id == my_id) my_player = player;
    });
  }
  
  // Watch for arrow key presses and send this information to the server so that
  // it can move the player in the correct direction.
  document.addEventListener("keydown", function(event){
    switch(event.code){
      case 'ArrowLeft': 
        socket.emit('direction', 3); // LEFT
        break;
      case 'ArrowUp': 
        socket.emit('direction', 0); // UP
        break;
      case 'ArrowRight': 
        socket.emit('direction', 1); // RIGHT
        break;
      case 'ArrowDown': 
        socket.emit('direction', 2); // DOWN
        break;
    }
  });
  
  // Create the game canvas.
  function createCanvas() {
    $('body').append('<canvas id="game_canvas"></canvas>');
    canvas = $('#game_canvas')[0];
    c = canvas.getContext('2d');
    // Set default width to window
    resize();
  }
  
  // Main game rendering loop. This is the client's primary job.
  function draw() {
    if(c !== undefined) {
      // Clear canvas
      c.clearRect(0, 0, canvas.width, canvas.height);
      // Draw gridlines.
      drawGrid();
      // Fill grid with game state info.
      fillGrid();
      // Draw minimap.
      drawMap();
    }
    window.requestAnimationFrame(draw);
  }
  
  // Draw the grid lines on the canvas based on screen height and width.
  function drawGrid() {
    var c_width = canvas.width;
    var c_height = canvas.height;
    
    var gap = c_width / view_w;
    c.lineCap = 'square';
    c.strokeStyle = '#D3D3D3';
    c.lineWidth = 1;
    
    // Draw vertical lines
    for(var i = 0; i < c_width; i += gap) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, c_height);
      c.stroke();
    }
    
    gap = c_height / view_h;
    
    // Draw horizontal lines
    for(var i = 0; i < c_height; i += gap) {
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(c_width, i);
      c.stroke();
    }
  }
  
  // Fill the grid with colored squares and other player's positions.
  function fillGrid() {
    var c_width = canvas.width;
    var c_height = canvas.height;
    
    var gap_w = c_width / view_w;
    var gap_h = c_height / view_h;
    
    var view_x;
    var view_y;
    
    if(can_render) {
      view_x = clamp(my_player.x - Math.floor(view_w / 2), 0, grid_w - view_w);
      view_y = clamp(my_player.y - Math.floor(view_h / 2) + 1, 0, grid_h - view_h);
      for(var i = 0; i < view_w; i++) {
        for(var j = 0; j < view_h; j++) {
          c.fillStyle = grid[i + view_x][j + view_y];
          var x = i * gap_w + 1;
          var y = j * gap_h + 1;
          c.fillRect(x, y, gap_w - 2, gap_h - 2);
        }
      }
      
      c.strokeStyle = '#000';
      c.lineWidth = 8;
      players.forEach(function(player) {
        var rel_x = player.x - view_x;
        var rel_y = player.y - view_y;
        var x = rel_x * gap_w + Math.ceil(c.lineWidth / 2) + 1;
        var y = rel_y * gap_h + Math.ceil(c.lineWidth / 2) + 1;
        c.strokeRect(x, y, gap_w - 2 * (Math.ceil(c.lineWidth / 2) + 1),
                           gap_h - 2 * (Math.ceil(c.lineWidth / 2) + 1));
      });
    }
  }
  
  // Draw the minimap in the top-left corner with the full game state
  // information.
  function drawMap() {
    var map_x = 5;
    var map_y = 5;
    var map_border = 2;
    var map_w = Math.floor(canvas.width / 7);
    var map_h = Math.floor(canvas.height / 7);
    
    var gap_w = (map_w - map_border * 2) / grid_w;
    var gap_h = (map_h - map_border * 2) / grid_h;
    
    if(can_render) {
      c.fillStyle = '#000';
      c.fillRect(map_x, map_y, map_w, map_h);
      
      for(var i = 0; i < grid_w; i++) {
        for(var j = 0; j < grid_h; j++) {
          c.fillStyle = grid[i][j];
          var x = map_x + map_border + i * gap_w;
          var y = map_y + map_border + j * gap_h;
          c.fillRect(x, y, gap_w, gap_h);
        }
      }
      
      c.strokeStyle = '#000';
      c.lineWidth = 1;
      players.forEach(function(player) {
        var x = map_x + map_border + player.x * gap_w;
        var y = map_y + map_border + player.y * gap_h;
        c.strokeRect(x, y, gap_w, gap_h);
      });
    }
  }
  
  // Resize the game canvas to fill the window.
  function resize() {
    if(c !== undefined) {
      c.canvas.width = window.innerWidth;
      c.canvas.height = window.innerHeight;
    }
  }
  
  // Show an error message.
  function showError(error) {
    console.error(error);
  }
  
  // Utility to contain a value within a minimum and maximum.
  function clamp(value, min, max) {
    if(value < min) return min;
    if(value > max) return max;
    return value;
  }

});
