// var cv = document.getElementById('cvs');
// var ct = cv.getc('2d');

/* global io */
/* global $ */
$(function() {
  var socket = io();
  
  var has_joined = false;
  var canvas, c;
  var grid_w = 75;
  var grid_h = 40;
  var grid = [];
  var players = [];
  var can_render = false;

  window.addEventListener('resize', resize);
  
  // $('form').submit(function() {
    if(!has_joined) {
      // Tell the server
      // socket.emit('message', {
      //   player_name: $('#player-name').val(),
      //   room_code: $('#room-code').val()
      // });
      
      // Remove the join screen
      $('#join').remove();
      has_joined = true;
      
      // Create the canvas
      createCanvas();
      // Start the rendering loop
      window.requestAnimationFrame(draw);
    }
    // return false;
  // });
  
  socket.on('update', function(data) {
    console.log('Received update!');
    for(var i = 0; i < data.length; i++) {
      grid.push(data[i]);
    }
  });
  
  socket.on('snapshot', function(state) {
    grid = state.grid_state;
    players = state.players;
  });
  
  socket.on('snapshot_start', function(state) {
    grid = state.grid_state;
    players = state.players;
    can_render = true;
  });
  
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
  
  function createCanvas() {
    $('body').append('<canvas id="game_canvas"></canvas>');
    canvas = $('#game_canvas')[0];
    c = canvas.getContext('2d');
    // Set default width to window
    resize();
  }
  
  function draw() {
    if(c !== undefined) {
      // Clear canvas
      c.clearRect(0, 0, canvas.width, canvas.height);

      drawGrid();
      
      fillGrid();
    }
    window.requestAnimationFrame(draw);
  }
  
  function drawGrid() {
    var c_width = canvas.width;
    var c_height = canvas.height;
    
    var gap = c_width / grid_w;
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
    
    gap = c_height / grid_h;
    
    // Draw horizontal lines
    for(var i = 0; i < c_height; i += gap) {
      c.beginPath();
      c.moveTo(0, i);
      c.lineTo(c_width, i);
      c.stroke();
    }
  }
  
  function fillGrid() {
    var c_width = canvas.width;
    var c_height = canvas.height;
    
    var gap_w = c_width / grid_w;
    var gap_h = c_height / grid_h;
    
    if(can_render) {
      for(var i = 0; i < grid_w; i++) {
        for(var j = 0; j < grid_h; j++) {
          c.fillStyle = grid[i][j];
          var x = i * gap_w + 1;
          var y = j * gap_h + 1;
          c.fillRect(x, y, gap_w - 2, gap_h - 2);
        }
      }
      
      c.strokeStyle = '#000';
      c.lineWidth = 2;
      players.forEach(function(player) {
        var x = player.x * gap_w + 1;
        var y = player.y * gap_h + 1;
        c.strokeRect(x, y, gap_w - 2, gap_h - 2);
      });
    }
  }
  
  function resize() {
    if(c !== undefined) {
      c.canvas.width = window.innerWidth;
      c.canvas.height = window.innerHeight;
    }
  }

});
