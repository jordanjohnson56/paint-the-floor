/* TODO
 * Add leave lobby button.
 * How to play.
 */

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
  var game_over = false;  // Has the game ended?
  var my_id, my_player;   // Client's player id and associated player object.
  var game_time;          // Current time left in the game.
  var splash = true;      // Show the splash screen canvas?

  // Resize the canvas when the window is resized.
  createCanvas();
  window.addEventListener('resize', resize);
  window.requestAnimationFrame(drawSplash);
  
  // Join room when player submits, if valid info is given.
  $('#join-room').submit(function(e) {
    e.preventDefault();
    var name_input = $('#player-name').val();
    var room_input = $('#room-code').val();
    if(!has_joined) {
      if(name_input != '') {
        if(name_input.length <= 12) {
          if(room_input != '') {
            // Tell the server
            socket.emit('join_room', {
              player_name: name_input,
              room_code: room_input
            });
          } else {
            showError('Please enter a room code.');
          }
        } else {
          showError('Please use a shorter name.');
        }
      } else {
        showError('Please enter a name.');
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
        if(name_input.length <= 12) {
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
          showError('Please use a shorter name.');
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
    // Remove the join screen
    $('#join').css("display", "none");
    has_joined = true;
    
    my_id = player.id;
    my_player = player;
    
    updateReadyButton();
    
    $('#room').css("display", "flex");
  });
  
  // Notification that a new player has joined lobby.
  socket.on('lobby_update', function(players) {
    if(players[0] !== undefined) {
      $('#player-one').html(players[0].name + ' ' + 
                            (hostIcon(players[0]) || readyIcon(players[0])));
    } else {
      $('#player-one').html('');
    }
    
    if(players[1] !== undefined) {
      $('#player-two').html(players[1].name + ' ' + 
                            (hostIcon(players[1]) || readyIcon(players[1])));
    } else {
      $('#player-two').html('');
    }
    
    if(players[2] !== undefined) {
      $('#player-three').html(players[2].name + ' ' + 
                            (hostIcon(players[2]) || readyIcon(players[2])));
    } else {
      $('#player-three').html('');
    }
    
    if(players[3] !== undefined) {
      $('#player-four').html(players[3].name + ' ' + 
                            (hostIcon(players[3]) || readyIcon(players[3])));
    } else {
      $('#player-four').html('');
    }
    
    updatePlayer(players);
    updateReadyButton();
  });
  
  function hostIcon(player) {
    return player.host ? '<i class="fa fa-h-square"></i>' : '';
  }
  
  function readyIcon(player) {
    return player.ready ? '<i class="fa fa-check"></i>' : '';
  }
  
  function updateReadyButton(toggle = false) {
    var ready_btn = $('#ready-button');
    var is_ready = ready_btn.attr('state') == 'is-ready';
    if(my_player.host) {
      $(ready_btn).removeClass().addClass('btn btn-primary');
      $(ready_btn).attr('state', 'host');
      $(ready_btn).html('Start Game <i class="fa fa-arrow-circle-right" aria-hidden="true"></i>');
    } else if((is_ready || toggle) && !(is_ready && toggle)) {
      $(ready_btn).removeClass().addClass("btn btn-success");
      $(ready_btn).attr('state', 'is-ready');
      $(ready_btn).html('<i class="fa fa-check"></i> Ready');
    } else {
      $(ready_btn).removeClass().addClass('btn btn-danger');
      $(ready_btn).attr('state', 'not-ready');
      $(ready_btn).html('<i class="fa fa-times"></i> Ready');
    }
  }
  
  // Ready button in the lobby.
  $('#ready').submit(function(e) {
    e.preventDefault();
    var button = $('#ready button')[0];
    if($(button).attr("state") == "not-ready") {
      updateReadyButton(true);
      socket.emit('player_ready', true);
    } else if($(button).attr("state") == "is-ready") {
      updateReadyButton(true);
      socket.emit('player_ready', false);
    } else {
      socket.emit('start_game');
    }
  });
  
  // Latest game state from the server.
  // Includes grid state, player states (positions), as well as some metrics to
  // help prevent cheating.
  socket.on('snapshot', function(state) {
    getStateInfo(state);
    game_over = false;
  });
  
  // Initial game state from server which tells the client that it can start
  // rendering the game.
  socket.on('snapshot_start', function(state) {
    getStateInfo(state);
    disableSplash();
    can_render = true;
    window.requestAnimationFrame(draw);
  });
  
  // Final game state when game ends.
  socket.on('game_over', function(state) {
    getStateInfo(state);
    game_over = true;
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
    
    updatePlayer(players);
    
    game_time = state.game_time;
  }
  
  function updatePlayer(players) {
    if(my_id !== undefined) {
      players.forEach(function(player) {
        if(player.id == my_id) my_player = player;
      });
    }
  }
  
  function disableSplash() {
    splash = false;
    $('#room').css("display", "none");
  }
  
  // Watch for arrow key presses and send this information to the server so that
  // it can move the player in the correct direction.
  document.addEventListener("keydown", function(event){
    if(!game_over) {
      switch(event.code) {
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
    }
  });
  
  // Create the game canvas.
  function createCanvas() {
    // $('body').append('<canvas id="game_canvas"></canvas>');
    canvas = $('#game_canvas')[0];
    c = canvas.getContext('2d');
    // Set default width to window
    resize();
  }
  
  // Main game rendering loop. This is the client's primary job.
  function draw() {
    if(c !== undefined && can_render) {
      // Clear canvas
      c.clearRect(0, 0, canvas.width, canvas.height);
      // Draw gridlines.
      drawGrid();
      // Fill grid with game state info.
      fillGrid();
      // Draw transparent background for info.
      drawInfoBackground();
      // Draw minimap.
      drawMap();
      // Draw game timer.
      drawTimer();
      // Draw player scores.
      drawScores();
      if(game_over) {
        // Draw game over screen.
        drawGameOver();
      }
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
    for(i = 0; i < c_height; i += gap) {
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
      view_y = clamp(my_player.y - Math.floor(view_h / 2) + 1, 0, 
                     grid_h - view_h);
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
    var map_border = 2;
    var map_w = Math.floor(canvas.width / 7);
    var map_h = Math.floor(canvas.height / 7);
    var map_x = 5;
    var map_y = canvas.height - map_h - 5;
    
    var gap_w = (map_w - map_border * 2) / grid_w;
    var gap_h = (map_h - map_border * 2) / grid_h;
    
    if(can_render) {
      c.fillStyle = '#000';
      c.fillRect(map_x, map_y, map_w, map_h);
      c.fillStyle = '#fff';
      c.fillRect(map_x + map_border, map_y + map_border, map_w - map_border * 2,
                 map_h - map_border * 2);
      
      for(var i = 0; i < grid_w; i++) {
        for(var j = 0; j < grid_h; j++) {
          var color = grid[i][j];
          if(color != '#FFFFFF') {
            c.fillStyle = color;
            var x = map_x + map_border + i * gap_w;
            var y = map_y + map_border + j * gap_h;
            c.fillRect(x, y, gap_w, gap_h);
          }
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
  
  // Draw a semi-transparent background to help read the scores and timer.
  function drawInfoBackground() {
    c.fillStyle = 'rgba(50,50,50,0.3)';
    c.strokeStyle = '#333';
    c.lineWidth = 1;
    c.fillRect(0,0,canvas.width, 124);
  }
  
  // Draw the game timer.
  function drawTimer() {
    if(game_time !== undefined && !isNaN(game_time)) {
      var min = Math.floor(game_time / 60);
      var sec = game_time % 60;
      if(sec < 10) sec = '0' + sec;
      var timer_text = min + ':' + sec;
      var x = canvas.width / 2;
      var y = 70;
      
      c.font = '60px Anonymous Pro';
      c.textAlign = 'center';
      c.fillStyle = 'black';
      
      c.fillText(timer_text, x, y);
    }
  }
  
  // Draw player scores.
  function drawScores() {
    if(players !== undefined) {
      for(var i = 0; i < players.length; i++) {
        var player = players[i];
        var name = player.name;
        var score = player.score;
        
        var gap_w = canvas.width / 6;
        var x;
        if(i < 2) x = (canvas.width / 2) - (gap_w * (2 - i));
        else      x = (canvas.width / 2) + (gap_w * (i - 1));
        var name_y = 40;
        var score_y = 97;
        
        c.font = '40px Anonymous Pro';
        c.textAlign = 'center';
        c.fillStyle = player.color;
        c.strokeStyle = 'black';
        c.lineWidth = 1;
        
        c.fillText(name, x, name_y);
        
        c.font = '54px Anonymous Pro';
        c.fillText(score, x, score_y);
      }
    }
  }
  
  // Draw game over screen with winner's name and score.
  function drawGameOver() {
    // Draw the background.
    c.fillStyle = '#aaa';
    
    var rect_w = canvas.width / 3;
    var rect_h = canvas.height / 3;
    var rect_x = canvas.width / 2 - rect_w / 2;
    var rect_y = canvas.height / 2 - rect_h / 2;
    
    c.fillRect(rect_x, rect_y, rect_w, rect_h);
    
    // Find the winner.
    var winner = players.reduce(function(max, player) {
      if(player.score > max.score) {
        return player;
      }
      return max;
    }, {score: -1});
    
    // Draw the winner's name and score.
    c.textAlign = 'center';
    
    var x = canvas.width / 2;
    var winner_y = canvas.height / 2 - 100;
    var winner_underline_y = canvas.height / 2 - 88;
    var name_y = canvas.height / 2;
    var score_y = canvas.height / 2 + 108;
    
    c.font = '72px Anonymous Pro';
    c.fillStyle = 'black';
    
    // Winner label.
    c.fillText('Winner', x, winner_y);
    
    var line_length = c.measureText('Winner').width;
    c.strokeStyle = 'black';
    c.lineWidth = 2;
    c.lineStyle = 'square';
    
    // Winner underline.
    c.beginPath();
    c.moveTo(x - line_length / 2 - 4, winner_underline_y);
    c.lineTo(x + line_length / 2 - 4, winner_underline_y);
    c.stroke();

    c.font = '108px Anonymous Pro';
    c.fillStyle = winner.color;
    
    // Winner name.
    c.fillText(winner.name, x, name_y);
    // Winner score.
    c.fillText(winner.score, x, score_y);
  }
  
  function drawSplash() {
    if(c !== undefined && splash) {
      // Clear canvas.
      c.clearRect(0, 0, canvas.width, canvas.height);
      // Draw gridlines.
      drawGrid();
      // Fill grid with splash screen.
      fillGridSplash();
    }
    window.requestAnimationFrame(drawSplash);
  }
  
  function fillGridSplash() {
    var c_width = canvas.width;
    var c_height = canvas.height;
    
    var gap_w = c_width / view_w;
    var gap_h = c_height / view_h;
    
    var view_x;
    var view_y;
    
    if(can_render) {
      view_x = clamp(my_player.x - Math.floor(view_w / 2), 0, grid_w - view_w);
      view_y = clamp(my_player.y - Math.floor(view_h / 2) + 1, 0, 
                     grid_h - view_h);
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
      // players.forEach(function(player) {
      //   var rel_x = player.x - view_x;
      //   var rel_y = player.y - view_y;
      //   var x = rel_x * gap_w + Math.ceil(c.lineWidth / 2) + 1;
      //   var y = rel_y * gap_h + Math.ceil(c.lineWidth / 2) + 1;
      //   c.strokeRect(x, y, gap_w - 2 * (Math.ceil(c.lineWidth / 2) + 1),
      //                     gap_h - 2 * (Math.ceil(c.lineWidth / 2) + 1));
      // });
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
