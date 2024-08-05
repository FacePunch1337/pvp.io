
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const compression = require("compression");


var players = {};
const rooms = {};
const weapons = [];	
let nickname;
let nextWeaponId = 1;
const weaponSpawnInterval = 5000;

app.use(express.static(path.join(__dirname, "public")));
app.use(compression());
app.get('/', (req,res) =>{
  res.send('Server is running')
});


app.get("/ban", (req, res) => { res.sendFile(path.join(__dirname, "public", "BAN.html")); });

function spawnRandomWeapon() {
  
  const x = Math.floor(Math.random() * 1200) + 1300;
  const y = Math.floor(Math.random() * 1080) + 1200;

  nextWeaponId++;

  // Generate a random number (0, 1, or 2) to determine the weapon type
  const randomType = Math.floor(Math.random() * 3);
  let weaponType;

  switch (randomType) {
    case 0:
      weaponType = "pistol";
      break;
    case 1:
      weaponType = "melee";
      break;
    case 2:
      weaponType = "trap";
      break;
  }

  const newWeapon = {
    id: nextWeaponId,
    weaponType: weaponType,
    x: x,
    y: y,
    isPickedUp: false,
    pool: 10,
  };

  weapons.push(newWeapon);
  io.emit("newWeapon", newWeapon);
}

function sendWeaponsInfo(socket) {
  weapons.forEach((weapon) => {
    socket.emit("newWeapon", weapon);
  });
}

io.on("connection", (socket) => {
  console.log("::USER CONNECTED: ", socket.id);

  const socketData = { player_id: socket.id };
  socket.socketData = socketData;

  players[socket.id] = 
  {
    rotation: 0,
    x: Math.floor(Math.random() * 1700) + 50,
    y: Math.floor(Math.random() * 1100) + 50,
    nickname: nickname,
    playerId: socket.id,
    isMoving: false,
    flipX: false
  };

  sendWeaponsInfo(socket);

  socket.emit("currentPlayers", players);
  socket.broadcast.emit("newPlayer", players);
  socket.emit("saveNickname", nickname);

    /////////////НИКНЕЙМ

    socket.on("saveNicknames", (nickname) => {
  
      nickname = nickname;
      console.log(nickname);
     
    
    });
  
  socket.on("syncSounds", (sound) => {
    socket.broadcast.emit("syncSound", sound);
  });
  



 



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

  socket.on("pickupWeapon", (weaponId, playerId) => {
    
    playerId = socket.id;
    console.log(`Игрок ${playerId} подобрал оружие с ID ${weaponId}`);
    
    const weapon = weapons.find((w) => w.id === weaponId);
    if (weapon) {
      
      weapon.isPickedUp = true;
     // console.log(weapon.isPickedUp);
      io.emit("weaponPickedUp", weaponId, socket.id, weapon.weaponType, weapon.isPickedUp);
    }
    
  });

  socket.on("dropWeapons", (weaponId, playerId) => {
    playerId = socket.id;
    console.log(`Игрок ${playerId} отпустил оружие с ID ${weaponId}`);

    const weapon = weapons.find((w) => w.id === weaponId);
    if (weapon) {
      weapon.isPickedUp = false;
      io.emit("weaponDrop", weaponId, socket.id);
     // console.log(weapon.isPickedUp);
    }
  });

  socket.on("weaponUpdates", (weaponData) => {
    socket.broadcast.emit("weaponUpdate", weaponData);
  });

  socket.on("bulletUpdates", (bulletData) => 
  {
    socket.broadcast.emit("bulletUpdate", bulletData);
  });

  
  socket.on("destroyBullets", (bulletData) => {
    socket.broadcast.emit("destroyBullet", bulletData);
    });

  socket.on("disconnect", () => 
  {
    console.log("::USER DISCONNECTED: ", socket.id);
    //delete players[socket.id];
    io.emit("disconnect", socket.id);
  });
});

function startGame(){
  //setInterval(spawnRandomWeapon, weaponSpawnInterval);
   
  for (let i = 0; i < 15; i++) {
    spawnRandomWeapon();
    
  }
    

}

setTimeout(() => { startGame(); }, 1000);






app.use((req, res) => { res.status(404).sendFile(path.join(__dirname, "public", "404.html")); });

server.listen(8081, () => { startGame(); console.log(`Server is spinning: -> 👽 http://localhost:8081/`); });