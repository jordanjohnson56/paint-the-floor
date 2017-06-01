var cv = document.getElementById('cvs');
var ct = cv.getContext('2d');


var socket = io.connect();
  
  socket.on('welcomeMessage', function(Wmsg){
    
    alert(Wmsg);
    
  });



