# Paint the Floor
Paint more of the floor than your opponents. Beware getting trapped! Web game developed with Node JS, socket.io, and HTML5 canvas.

1. [Usage](#usage)
2. [About](#about)
3. [Technologies](#tech)

### <a name="usage"></a> Usage
First run this to install the node packages:
```
npm install
```
Then start the server:
```
node server <ip-address> <port>
```
Or visit [Heroku](http://rocky-anchorage-30253.herokuapp.com/) to play the latest version.

### <a name="about"></a> About Paint the Floor
Paint the Floor is a game idea I thought up along with a friend of mine. As it turns out, I developed the game alone, which was alright by me because it was an excellent learning experience. I'd always wanted to make my own multiplayer game, just to figure out what networking is like, and I finally had my idea and my opportunity. 

The main idea of the game is that the player's goal is to paint as much of the floor as they can, and the winner is the player who paints the most tiles. To paint a piece of the floor, all a player has to do is touch the floor tile. A few ideas were brainstormed, but ultimately an enclosed grid was chosen. This limits the number of tiles in the game, making the available tiles "valuable". I also decided to allow obstacles to be spawned in at the beginning of the game – tiles that no one owns and no one can cross. However, in it's current state, every room has the exact same rectangular obstacle in the center of the board. I had planned on changing this to allow circular obstacles to be spawned randomly throughout the room, but have yet to implement this feature.

What is likely the most prominent game mechanic is that players are only able to move across unpainted tiles and their own tiles. This means that if a player gets boxed in by another player, they will be stuck for the rest of the game. Thus, players must be wary of their opponents to avoid getting trapped and losing the game. This mechanic brought about a timer, so that if a player does get trapped, they will never have to wait more than three minutes before the game ends. However, if they've already lost, they can simply choose to refresh the page and join a new game without waiting around. Their player will disappear from the game in progress, but the tiles they painted will remain.

Finally, we decided on lobbies/rooms of up to four players as the method of player grouping. This way friends can paint the floor with their friends instead of a bunch of strangers who may have been playing for years (that's an exaggeration, but makes the point). Lobbies are not password protected, but each room has a specific code or name which the host decides on and gives to the other players, and this code works like a password to keep unwanted guests out of the lobby. 

### <a name="tech"></a> Technologies
When I first started in Web Design, during my high school days, I worked with JavaScript enough to know what the syntax looked like and the basic things it could do for me. It wasn't until the summer of 2017 that I learned how powerful JavaScript had become. I'd been advised to look into Node JS and socket.io, so that's what I did. After I'd done my research, I decided the pair would be perfect for what I wanted to do. Socket.io made networking seem so easy when compared to the college networking course I'd just finished. 

So that's how I got started. There's a bit of HTML and CSS on the frontend, but the majority of the code is JavaScript, using HTML5 Canvas to render everything on the clientside. Meanwhile, Node JS runs the backend and socket.io connects the client and server. 

As a typical user, there are a lot of intricacies that go on behind the scenes that you wouldn't ever think about. One of these intricacies, specifically in the world of gaming, is anticheat. This describes the methods used to prevent malicious users from abusing or breaking the game system. For Paint the Floor, it wasn't too difficult to come up with a method to prevent cheating. I just had to realize that you always need to expect players to try to cheat. In order to prevent this, I set up the client so that the only thing it has responsibility of is showing the game to the player and sending player input back to the server. The client doesn't decide where the player is in the game, it only shows the game based on where the player is at. Since there isn't any hidden information in Paint the Floor, I just send the entirety of the game state to the client. This needs to be done so that the minimap can be rendered. A player's movement is desribed as up, down, left or right, and that's what the client will tell the server based on the player's input. Then the server is responsible for updating the player's position every game tick.

That's pretty much it. JavaScript is used on the client-side along with HTML5 canvas to display the game to the user. JavaScript is used on the server-side with Node JS in order to process information from all of the players and send the game state back to the clients. The sending of information is handled by socket.io on both sides. This is what makes up Paint the Floor. Networking the game was easier than I'd ever imagined it would be. The project as a whole wasn't very difficult to implement, and I really enjoyed doing so. More than anything, I learned new things and took a project from start to (essentially) finished. I am continuing to work on new projects and learn more about JavaScript and technology as a whole, all of which is very exciting.
