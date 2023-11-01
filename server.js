const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");


var players = {};
var weapone = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

io.on("connection", (socket) => 
{
  console.log("Пользователь подключился: ", socket.id);

  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,  
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    isMoving: false, // Добавляем информацию о состоянии движения
    flipX: false, // Добавляем информацию о flipX
  };

  // Отправить информацию о существующих игроках новому игроку
  socket.emit("currentPlayers", players);
  // send the star object to the new player
  socket.emit('weaponeLocation', weapone);
  // Отправить информацию о новом игроке другим игрокам
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("disconnect", () => {
    console.log("Пользователь отключился: ", socket.id);
    delete players[socket.id];
    io.emit("disconnect", socket.id);
  });

  socket.on("playerMovement", (movementData) => {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].isMoving = movementData.isMoving;
    players[socket.id].flipX = movementData.flipX; // Обновляем flipX
    players[socket.id].animationKey = movementData.animationKey;
    // Теперь отправляем информацию о движении и flipX всем клиентам, включая отправившего
    io.emit("playerMoved", players[socket.id]);

    // Дополнительно отправьте информацию о flipX только другим клиентам (исключая отправившего)
    socket.broadcast.emit("flipXUpdate", {
      playerId: socket.id,
      flipX: movementData.flipX,
    });
    // Отправляем информацию об анимации только другим клиентам (исключая отправившего)
    socket.broadcast.emit("animationUpdate", {
      playerId: socket.id,
      animationKey: movementData.animationKey,
    });
  });

  // Добавим обработку события "новый игрок" и отправку информации о нем текущему игроку
  socket.on("newPlayer", () => {
    socket.emit("currentPlayers", players);
  });
  socket.on('weaponeCoords', (CoordData) => {
   
    weapone.x = CoordData.x;
    weapone.y = CoordData.y;
    
    io.emit('weaponeLocation', weapone);

  });

});

server.listen(8081, () => {
  console.log(`Server is spinning: -> ⚔ http://localhost:8081/`);
});
