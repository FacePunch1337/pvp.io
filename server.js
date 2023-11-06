const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const mysql = require("mysql2");

var players = {};

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game.html"));
});

io.on("connection", (socket) => {
  console.log("Пользователь подключился: ", socket.id);

  const socketData = { player_id: socket.id };

  socket.socketData = socketData;

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
  // Отправить информацию о новом игроке другим игрокам
  socket.broadcast.emit("newPlayer", players[socket.id]);

  socket.on("disconnect", () => {
    console.log("Пользователь отключился: ", socket.id);
    delete players[socket.id];
    io.emit("disconnect", socket.id);
  });

  // == Chat container. ==
  socket.on("chatMessage", (message) => {
    const sql = "INSERT INTO ChatHistory (nickname, message) VALUES (?, ?)";

    db.query(sql, [message.user, message.text], (err, result) => {
      if (err)
        console.error("Ошибка при вставке сообщения в базу данных:", err);
      else console.log(`📧 MESSAGE SEND CONFIRMED: ${JSON.stringify(message)}`);
    });

    socket.broadcast.emit("chatMessage", message);
  });
  // ==

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
});

// == DB CHAT SECTOR ==
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "root",
});

db.connect((err) => {
  db.query("CREATE DATABASE IF NOT EXISTS pvp_db", (err, result) => {
    if (err) console.error("Error creating database:", err);
  });

  db.changeUser({ database: "pvp_db" }, (err) => {
    if (err) console.error("Error when changing database:", err);
  });

  db.query(`
    CREATE TABLE IF NOT EXISTS chat_history 
    (
      id INT PRIMARY KEY AUTO_INCREMENT, 
      nickname VARCHAR(50), 
      message VARCHAR(1000),
      date_sent TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }

  console.log("💾Connected to base [true]");
});
// ==

server.listen(8081, () => {
  console.log(`Server is spinning: -> 🍕 http://localhost:8081/`);
});
