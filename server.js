  const express = require("express");
  const app = express();
  const server = require("http").Server(app);
  const io = require("socket.io")(server);
  const path = require("path");

  const players = {};
  const weapons = [];
  let nextWeaponId = 1;
  const weaponSpawnInterval = 5000;

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
      isMoving: false,
      flipX: false,
      currentWeapon: null,
    };

    socket.emit("currentPlayers", players);
    socket.broadcast.emit("newPlayer", players[socket.id]);

    socket.emit("availableWeapons", weapons);
    socket.broadcast.emit("availableWeapons", weapons);

    socket.on("disconnect", () => {
      console.log("Пользователь отключился: ", socket.id);
      delete players[socket.id];
      io.emit("disconnect", socket.id);
    });

    // == Chat container. ==
    socket.on("chatMessage", (message) => {
      console.log(`📧 MESSAGE SEND CONFIRMED: ${JSON.stringify(message)}`);
      socket.broadcast.emit("chatMessage", message);
    });
    // ==

    socket.on("playerMovement", (movementData) => {
      players[socket.id] = { ...players[socket.id], ...movementData };
      io.emit("playerMoved", players[socket.id]);
      socket.broadcast.emit("flipXUpdate", {
        playerId: socket.id,
        flipX: movementData.flipX,
      });
      socket.broadcast.emit("animationUpdate", {
        playerId: socket.id,
        animationKey: movementData.animationKey,
      });
    });

    socket.on("updateCurrentWeapon", (weaponId) => {
      // Обновите информацию о текущем оружии игрока
      players[socket.id].currentWeapon = weaponId;
      
      // Отправьте обновление оружия всем подключенным клиентам, чтобы они могли применить `armed`
      io.emit("weaponUpdate", {
        playerId: socket.id,
        weaponId: weaponId,
      });
    });

    socket.on("pickupWeapon", (weaponId, playerId) => {
      // Здесь вы можете выполнить логику для подбора оружия, используя weaponId
      // Например, вы можете удалить оружие с сервера и отправить уведомления другим игрокам
    // Найдите оружие, которое игрок подбирает
 
      playerId = socket.id;
      
    // weapons[weaponId].x = playerId.x;
      //weapons[weaponId].x = playerId.x;
      // Вывести сообщение в консоль
      console.log(`Игрок ${playerId} подобрал оружие с ID ${weaponId}`);
      
        // Возможно, у вас также есть логика для скрытия оружия у других игроков
    
      // Другая логика подбора оружия
    
      // Отправить уведомление о подборе оружия всем подключенным клиентам
      io.emit("weaponPickedUp",  weaponId, playerId, );
    
      // Дополнительная логика подбора оружия
    });
    
    socket.on("removeWeapon", (weaponId) => {
      const weaponIndex = weapons.findIndex((weapon) => weapon.id === weaponId);
      if (weaponIndex !== -1) {
        weapons.splice(weaponIndex, 1);
        io.emit("removeWeapon", weaponId);
      }
    });

    socket.on("weaponUpdates", (weaponData) => {
      weaponData.playerId = socket.id;
      
      console.log(`Игрок ${weaponData.playerId} подобрал оружие ${weaponData.weaponId}.`);
      io.emit("weaponUpdate", weaponData);
    });
  });

  function spawnRandomWeapon() {
    const x = Math.floor(Math.random() * 700) + 50;
    const y = Math.floor(Math.random() * 500) + 50;
    nextWeaponId++;
    const newWeapon = {
      id: nextWeaponId,
      x: x,
      y: y,
      isPickedUp: false,
    };
    weapons.push(newWeapon);
    io.emit("newWeapon", newWeapon);
  }

  setInterval(spawnRandomWeapon, weaponSpawnInterval);

  server.listen(8081, () => {
    console.log(`Сервер запущен: -> ⚔ http://localhost:8081/`);
  });
