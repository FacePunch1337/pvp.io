var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
},
  scene: {
    preload: preload,
    create: create,
    update: update,
    
  },
  backgroundColor: 0x242424 // Задать цвет фона в формате 0xRRGGBB
};
  




const game = new Phaser.Game(config);

// == Natural session check. == 
function Correctness()
{
  if(sessionStorage.getItem('in_session') === 'true')
    console.log("Access is allowed")
  else
    window.location.href = "/";
}

Correctness();
// == 

let player;
let hasWeapon = false;
//let weapon = null;
let customCursor;
let isMoving = false;
let isFlipX = false;
let idleAnim;
let moveAnim;
let speed = 2.5;
let self;
let isBulletFired = false;

let bullets = [];
let bulletSpeed = 1000;
let maxBullets = 10; // Максимальное количество пуль в пуле
let maxBulletDistance = 1000; // Максимальное расстояние, которое может пролететь пуля
let playerWeaponId = null; 
let playerWeapon = null;
let playerWeapons = []; // Создайте массив для хранения оружи


function preload() {
  this.load.spritesheet('playerIdle', 'assets/player/idle.png', { frameWidth: 40, frameHeight: 40 });
  this.load.spritesheet('playerMove', 'assets/player/run.png', { frameWidth: 40, frameHeight: 40 });
  this.load.spritesheet('pistolSprite', 'assets/weapone/pistol/pistol.png', { frameWidth: 64, frameHeight: 32 });
  this.load.spritesheet('pistolIdle', 'assets/weapone/pistol/pistolidle.png', { frameWidth: 64, frameHeight: 32 });
  this.load.image('pistolImage', 'assets/weapone/pistol/pistol.png');
  this.load.image('bullet', 'assets/weapone/bullet.png');
  this.load.image('customCursor', 'assets/aim.png');

   
  
}

function create() {
 

  self = this;
  this.socket = io();
  
    
  player = this.physics.add.sprite(100, 100, 'playerIdle');
  player.setOrigin(0, 0);
  player.setDepth(0.3);
  player.setDepth(1);

 

  this.load.image('bullet', 'assets/weapone/bullet.png');


  document.body.style.cursor = 'none';
  this.customCursor = this.add.sprite(800, 700, 'customCursor');
  this.customCursor.setOrigin(0, 0);
  this.customCursor.setScale(0.3);
  this.customCursor.setDepth(2);

  // Locks pointer on mousedown
  game.canvas.addEventListener('mousedown', () => {
    game.input.mouse.requestPointerLock();
});
 
  this.input.on(
    'pointermove',
    function (pointer)
    {
        if (this.input.mouse.locked)
        {
            // Move reticle with mouse
            this.customCursor.x += pointer.movementX;
            this.customCursor.y += pointer.movementY;

            // Only works when camera follows player
            const distX = this.customCursor.x - player.x;
            const distY = this.customCursor.y - player.y;

            // Ensures reticle cannot be moved offscreen
            if (distX > 800) { this.customCursor.x = player.x + 800; }
            else if (distX < -800) { this.customCursor.x = player.x - 800; }

            if (distY > 600) { this.customCursor.y = player.y + 600; }
            else if (distY < -600) { this.customCursor.y = player.y - 600; }
        }
    },
    this
);



 
 

  this.idleAnim = this.anims.create({
    key: 'idle',
    frames: this.anims.generateFrameNumbers('playerIdle', { start: 0, end: 4 }),
    frameRate: 10,
    repeat: -1,
  });

  this.moveAnim = this.anims.create({
    key: 'move',
    frames: this.anims.generateFrameNumbers('playerMove', { start: 0, end: 6 }),
    frameRate: 10,
    repeat: -1,
  });

  
  this.pistolIdleAnim = this.anims.create({
    key: 'pistol_idle',
    frames: this.anims.generateFrameNumbers('pistolIdle', { start: 0, end: 0 }),
    frameRate: 10,
    repeat: -1,
  });
  this.pistolShootAnim= this.anims.create({
    key: 'pistol_shoot',
    frames: this.anims.generateFrameNumbers('pistolSprite', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: 0,
  });

 
  
  
      

  

  this.otherPlayers = this.add.group();
  this.weaponsGroup = this.add.group();
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        if (!player) {
          addPlayer(self, players[id]);
         
        }  
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on('disconnect', function (playerId) {
    if (playerId === self.socket.id) {
      // Игрок переподключился, очищаем его оружие
      hasWeapon = false;
      
    } else {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy();
        }
      });
    }
  });
  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });
  this.socket.on('flipXUpdate', function (data) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (data.playerId === otherPlayer.playerId) {
        otherPlayer.setFlipX(data.flipX);
      }
    });
  });
  this.socket.on('animationUpdate', function (data) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (data.playerId === otherPlayer.playerId) {
        if (data.animationKey === 'move') {
          otherPlayer.play('move', true);
        } else {
          otherPlayer.play('idle', true);
        }
      }
    });
  });

  
// Позже, при создании оружия на клиенте, используйте его уникальный идентификатор
this.socket.on("newWeapon", function (newWeapon) {
  createWeapon(self, newWeapon.x, newWeapon.y, newWeapon.id);  
  
});

// Задаем обработчик события "availableWeapons"
this.socket.on("availableWeapons", function (availableWeapons) {
  // Создаем оружие для каждого доступного на сервере
  availableWeapons.forEach((weapon) => {
    // Проверьте, не создано ли уже оружие у игрока
    const existingWeapon = playerWeapons.find((w) => w.id === weapon.id);
    if (!existingWeapon) {
      createWeapon(self, weapon.x, weapon.y, weapon.id);
    }
  });
}); 

this.socket.on("weaponPickedUp", function (weaponId, playerId) {
 
 
  console.log(`Игрок ${playerId} подобрал оружие с ID ${weaponId}`);
  
  if (playerId === self.socket.id) {
    console.log(`Игрок ${playerId} это мы`);
    playerWeaponId = weaponId;
    playerWeapon = playerWeapons.find((weapon) => weapon.id === weaponId);
    playerWeapon.isPickedUp = true;
   
  }
  
});

this.socket.on('playerMoved', function (playerInfo) {
  self.otherPlayers.getChildren().forEach(function (otherPlayer) {
    if (playerInfo.playerId === otherPlayer.playerId) {
      otherPlayer.setRotation(playerInfo.rotation);
      otherPlayer.setPosition(playerInfo.x, playerInfo.y);
    }
  });
});

this.socket.on('weaponUpdate', function (weaponData) {
  self.otherPlayers.getChildren().forEach(function (otherPlayer) {
    self.weaponsGroup.getChildren().forEach(function (playerWeapon) {
      if (weaponData.weaponId === playerWeapon.id) {
        const pistolOffsetX = weaponData.weaponFlipX ? 10 : 30;
        const pistolOffsetY = 15;
        const weaponX = weaponData.playerX + pistolOffsetX;
        const weaponY = weaponData.playerY + pistolOffsetY;

        // Проверка, что это не локальный игрок
        if (otherPlayer.playerId !== self.socket.id) {
          playerWeapon.weaponX = weaponX;
          playerWeapon.weaponY = weaponY;
          playerWeapon.setFlipX(calculateFlipX(weaponData.chel, weaponData.cursor));
          playerWeapon.setPosition(weaponX, weaponY);
          console.log("suka");
          // угол вращения оружия
          if (weaponData.weaponFlipX) {
            playerWeapon.setRotation(Math.PI + weaponData.angle);
            playerWeapon.setOrigin(1, 0.5);
          } else {
            playerWeapon.setRotation(weaponData.angle);
            playerWeapon.setOrigin(0, 0.5);
          }
        }
      }
   
    });
  });
});

this.socket.on('bulletUpdate', function (bulletData) {
  self.otherPlayers.getChildren().forEach(function (otherPlayer) {
    self.weaponsGroup.getChildren().forEach(function (playerWeapon) {
      if (bulletData.weaponId === playerWeapon.id) {
       
   
    const bullet = self.physics.add.image(bulletData.playerWeaponX, bulletData.playerWeaponY, 'bullet');
  
    self.physics.velocityFromRotation(bulletData.angle, bulletData.bulletSpeed, bullet.body.velocity);

    bullet.setRotation(bulletData.angle);
    bullet.setActive(true);
    bullet.setVisible(true);

  // Установите таймер на удаление пули через 3 секунды
     self.time.delayedCall(1000, () => {
      bullet.destroy();
      });

    }
   
    });
  });
});
   
  

this.physics.add.overlap(player, this.weaponsGroup, (player, weapon) => {
  if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)) ) {
    // Отправить серверу запрос на подбор оружия
    onPickupWeapon(player, weapon);
    this.socket.emit("pickupWeapon", weapon.id);
  }
});



  



}


function update() {
  
  move();

  if (isMoving) {
    player.play('move', true);
    
  } else {
    player.play('idle', true);
    
  }

  var x = player.x;
  var y = player.y;
  // Возьмите первое оружие из массива (вы можете настроить логику выбора)
  const targetX = self.customCursor.x;
  const targetY = self.customCursor.y;

// Задаем плавное перемещение камеры к прицелу
const cameraSpeed = 0.1;
const camX = this.cameras.main.scrollX;
const camY = this.cameras.main.scrollY;
const newCamX = camX + (targetX - game.config.width / 2 - camX) * cameraSpeed;
const newCamY = camY + (targetY - game.config.height / 2 - camY) * cameraSpeed;

// Устанавливаем новую позицию камеры
this.cameras.main.scrollX = newCamX;
this.cameras.main.scrollY = newCamY;




    // Constrain position of reticle
  constrainReticle(this.customCursor, 400);


  // Проверьте, есть ли какое-либо оружие в руках игрока
  
    
    
  if (playerWeapon) {


    armed(playerWeapon);
    this.input.on('pointerdown', function (pointer) {
      if (pointer.leftButtonDown() && playerWeapons.length > 0) {
        // Запускаем анимацию стрельбы
        playerWeapon.play('pistol_shoot', true);
        // Вызываем метод shoot
        shoot(playerWeapon);
      } else if (!pointer.leftButtonDown()) {
        // Воспроизводим анимацию пистолета в руке игрока в состоянии покоя
        playerWeapon.play('pistol_idle', true);
      }

    
    });

  }

  
  player.setFlipX(calculateFlipX(player, self.customCursor));
   

}

 
   
function armed(weapon){
  weapon = playerWeapons[0];
    const angleToCursor = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);

    const pistolOffsetX = isFlipX ? 10 : 30; // Смещение пистолета в зависимости от отзеркаливания
    const pistolOffsetY = 15; // Смещение пистолета относительно персонажа по вертикали
  
    
    weapon.x = player.x + pistolOffsetX;
    weapon.y = player.y + pistolOffsetY;
   
    // Flip the player and the pistol based on the player's direction
    
  
    weapon.setFlipX(calculateFlipX(player, self.customCursor));
  
     // угол вращения оружия
     if (isFlipX) {
      weapon.setRotation(Math.PI + angleToCursor); // 180 градусов
      weapon.setOrigin(1, 0.5); //pivot в правую сторону
      
    } else {
      weapon.setRotation(angleToCursor); // Нет вращения
      weapon.setOrigin(0, 0.5); // spivot в исходное положение
    }
    
   // Emit the "weaponUpdates" event to all clients
   self.socket.emit("weaponUpdates", {
     chel: player,
     playerId: player.id,
     weaponId: weapon.id,
     playerX: player.x,
     playerY: player.y,
     weaponX: weapon.x,
     weaponY: weapon.y,
     weaponRotation: weapon.rotation,
     weaponFlipX: isFlipX,
     angle: angleToCursor,
     cursor: self.customCursor,
  
     

   });
    
}
  
   


function move() {
  let dx = 0;
  let dy = 0;
  const mouseX = self.input.activePointer.worldX;
  const mouseY = self.input.activePointer.worldY;
  let moveSpeed = speed;
  isFlipX = calculateFlipX(player, self.customCursor);
  let animationKey = isMoving ? 'move' : 'idle'; // Определение текущей анимации

  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W).isDown) {
    dy -= 1;
  }
  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S).isDown) {
    dy += 1;
  }
  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A).isDown) {
    dx -= 1;
  }
  if (self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D).isDown) {
    dx += 1;
  }

  if (dx !== 0 || dy !== 0) {
    moveSpeed *= Math.sqrt(0.5);
    isMoving = true;
  } else {
    isMoving = false;
  }

  // Нормализация вектора движения по диагонали
  const magnitude = Math.sqrt(dx * dx + dy * dy);
  if (magnitude !== 0) {
    dx /= magnitude;
    dy /= magnitude;
  }

  player.x += dx * moveSpeed;
  player.y += dy * moveSpeed;
  

  self.socket.emit('playerMovement', {
    x: player.x,
    y: player.y,
    isMoving: isMoving,
    flipX: isFlipX, 
    animationKey: animationKey, 
  });

   player.oldPosition = {
     x: player.x,
     y: player.y,
   };

  
  
}

function constrainReticle (customCursor, radius)
{
    const distX = customCursor.x - player.x; // X distance between player & reticle
    const distY = customCursor.y - player.y + 20; // Y distance between player & reticle

    // Ensures reticle cannot be moved offscreen
    if (distX > 800) { customCursor.x = player.x + 800; }
    else if (distX < -800) { customCursor.x = player.x - 800; }

    if (distY > 600) { customCursor.y = player.y + 600; }
    else if (distY < -600) { customCursor.y = player.y - 600; }

    // Ensures reticle cannot be moved further than dist(radius) from player
    const distBetween = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        customCursor.x,
        customCursor.y
    );
    if (distBetween > radius)
    {
        // Place reticle on perimeter of circle on line intersecting player & reticle
        const scale = distBetween / radius;

        customCursor.x = player.x + (customCursor.x - player.x) / scale;
        customCursor.y = player.y + (customCursor.y - player.y) / scale;
    }
}

function calculateFlipX(obj, cursor) {
  var angle = Phaser.Math.Angle.Between(obj.x, obj.y, cursor.x, cursor.y);
  return angle > Math.PI / 2 || angle < -Math.PI / 2;
}

function shoot(playerWeapon) {
  // Calculate the angle between the player and the cursor
  const angleToCursor = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);

  // Создаем пулю
  const bullet = self.physics.add.image(playerWeapon.x, playerWeapon.y, 'bullet');
  const bulletSpeed = 2000;
  self.physics.velocityFromRotation(angleToCursor, bulletSpeed, bullet.body.velocity);

  bullet.setRotation(angleToCursor);
  bullet.setActive(true);
  bullet.setVisible(true);
  bullets.push(bullet);
  // Установите таймер на удаление пули через 3 секунды
  self.time.delayedCall(1000, () => {
    bullet.destroy();
  });

  self.socket.emit("bulletUpdates", {
    bullet: bullet,
    bulletSpeed: bulletSpeed,
    velocity: bullet.body.velocity,
    playerId: player.id,
    weaponId: playerWeapon.id,
    playerWeaponX: playerWeapon.x,
    playerWeaponY: playerWeapon.y,
    angle: angleToCursor,
    
  });

}
  



function createWeapon(self, x, y, weaponId) {
  const weapon = self.physics.add.sprite(x, y, 'pistolIdle');
  weapon.setOrigin(0, 0); //  pivot в исходное положение
  weapon.id = weaponId; // уникальный идентификатор оружия
  self.weaponsGroup.add(weapon); // Добавляем оружие в группу
  console.log(`spawn weapon id = ${weaponId}`);

 
  return weapon;
}




function onPickupWeapon(player, weapon) {
  if (!hasWeapon) {
    player.weapon = weapon;
    weapon.setDepth(2);
    weapon.x = player.x;
    weapon.y = player.y;
    weapon.isPickedUp = true;
    playerWeapons.push(weapon);
    hasWeapon = true; // Установка флага наличия оружия
   // self.socket.emit("pickupWeapon", weapon.id, self.socket.id);
  }
}

function addPlayer(self, playerInfo) {
  self.player = self.add.sprite(playerInfo.x, playerInfo.y, 'playerIdle');
  self.player.play('idle');
  
}

function addOtherPlayers(self, playerInfo) {
  // Проверка, не существует ли игрок с таким playerId уже в группе
  const existingPlayer = self.otherPlayers.getChildren().find((player) => player.playerId === playerInfo.playerId);

  if (!existingPlayer) {
    const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'playerIdle');
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.setOrigin(0, 0); 
    otherPlayer.setDepth(0); // Установите origin для нового игрока

    self.otherPlayers.add(otherPlayer);
  }
}