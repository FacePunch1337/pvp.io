var config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
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
let weapone;
let customCursor;
let isMoving = false;
let isFlipX = false;
let idleAnim;
let moveAnim;
let pistol = null;
let pistolAnim;
let speed = 2.5;
let self;
let isBulletFired = false;

let bullets;
let bulletSpeed = 1000;
let maxBulletDistance = 1000; // Максимальное расстояние, которое может пролететь пуля

//let bulletGroup;


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
  pistol = this.physics.add.sprite(player.x, player.y, 'pistolSprite');
  pistol.setOrigin(0, 0);
  pistol.setDepth(0.3);
  pistol.setDepth(0);

  pistol.x = 0; // Смещение пистолета относительно персонажа по горизонтали
  pistol.y = 0; // Смещение пистолета относительно персонажа по вертикали


  this.load.image('bullet', 'assets/weapone/bullet.png');
// В функции create
bullets = this.physics.add.group({
  classType: Phaser.Physics.Arcade.Image,
  maxSize: 50,
  key: 'bullet',
  active: false,
  visible: false,
});
  /*bulletGroup = this.physics.add.group({
    classType: Phaser.Physics.Arcade.Image,
    maxSize: 50, // Максимальное количество пуль
    key: 'bulletSprite', // Изображение пули
  });*/

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

/*this.input.on('pointerdown', function (pointer) {
  if (pointer.leftButtonDown() && player.pistol) {
    // Здесь вызовите анимацию pistol_shoot
    pistol.play('pistol_shoot', true);
    // Добавьте здесь логику для стрельбы
    // Создайте пулю и установите ей скорость в направлении указателя мыши
    // Например:
    shoot();
    
  }
  else if(!pointer.leftButtonDown()){
    pistol.play('pistol_idle', true);
  }
  
  
  
  
});*/

this.input.keyboard.on('keydown-Q', throwWeapon, this);

this.physics.add.overlap(player, pistol, function () {
  if (Phaser.Input.Keyboard.JustDown(self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E))) {
    onPickupWeapon(player, pistol);
  }
});

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
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
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

 

  //player.setFlipX(calculateFlipX(player, self.customCursor));
  //this.socket.emit('weaponeCoords', { weaponeX: this.weapone.x, weaponeY: this.weapone.y, rotation: this.weapone.rotation });
  // Проверьте, если клавиша "E" нажата, и если да, то выполните подбор оружия

  if (player.pistol) {
  // Calculate the angle between the player and the cursor
  const angleToCursor = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);

  const pistolOffsetX = isFlipX ? 10 : 30; // Смещение пистолета в зависимости от отзеркаливания
  const pistolOffsetY = 15; // Смещение пистолета относительно персонажа по вертикали

  pistol.x = player.x + pistolOffsetX;
  pistol.y = player.y + pistolOffsetY;
 
  // Flip the player and the pistol based on the player's direction
  pistol.setFlipX(calculateFlipX(player, self.customCursor));

  // Установите угол вращения оружия
  if (isFlipX) {
    pistol.setRotation(Math.PI + angleToCursor); // 180 градусов
    pistol.setOrigin(1, 0.5); // Переместите pivot в правую сторону
  } else {
    pistol.setRotation(angleToCursor); // Нет вращения
    pistol.setOrigin(0, 0.5); // Верните pivot в исходное положение
  }

    /*const bullet = this.physics.add.image(player.x, player.y, 'bulletSprite');
    const speed = 1000;
    this.physics.velocityFromRotation(angleToCursor, speed, bullet.body.velocity);*/
  
 }

 this.input.on('pointerdown', function (pointer) {
  if (pointer.leftButtonDown() && player.pistol) {
    // Запускаем анимацию стрельбы
    pistol.play('pistol_shoot', true);
    // Вызываем метод shoot
    shoot();
  } else if (!pointer.leftButtonDown()) {
    // Воспроизводим анимацию пистолета в руке игрока в состоянии покоя
    pistol.play('pistol_idle', true);
  }
});

 player.setFlipX(calculateFlipX(player, self.customCursor));

 if (!self.input.activePointer.leftButtonDown()) {
  pistol.play('pistol_idle', true);
}


/*bulletGroup.getChildren().forEach((bullet) => {
  // Проверьте, находится ли пуля за пределами экрана
  if (bullet.x < 0 || bullet.x > game.config.width || bullet.y < 0 || bullet.y > game.config.height) {
    bulletGroup.killAndHide(bullet); // Отключите и скройте пулю
  }
});

// Удалите пули, находящиеся на большом расстоянии от игрока
bulletGroup.getChildren().forEach((bullet) => {
  const distanceToPlayer = Phaser.Math.Distance.Between(player.x, player.y, bullet.x, bullet.y);
  if (distanceToPlayer > 2000) {
    bulletGroup.killAndHide(bullet); // Отключите и скройте пулю
  }
});*/
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

  /*self.socket.emit('weaponeCoords', {
    weaponeX: weapone.x,
    weaponeY: weapone.y,
  
  });*/


  
   // save old position data
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

function shoot() {
 
  // Calculate the angle between the player and the cursor
  const angleToCursor = Phaser.Math.Angle.Between(player.x, player.y, self.customCursor.x, self.customCursor.y);

  // Создаем пулю
  const bullet = self.physics.add.image(pistol.x, pistol.y, 'bullet');
  const bulletSpeed = 2000;
  self.physics.velocityFromRotation(angleToCursor, bulletSpeed, bullet.body.velocity);

  bullet.setRotation(angleToCursor);
  bullet.setActive(true);
  bullet.setVisible(true);

  // Установите таймер на удаление пули через 3 секунды
  self.time.delayedCall(1000, () => {
    bullet.destroy();
  });
  

}
function throwWeapon() {
  if (event.code === 'KeyQ' && player.pistol) {
    // Получите текущее положение игрока и прицела
    const playerX = player.x;
    const playerY = player.y;
    const cursorX = self.customCursor.x;
    const cursorY = self.customCursor.y;

    // Вычислите направление броска оружия
    const directionX = cursorX - playerX;
    const directionY = cursorY - playerY;

    // Создайте новый экземпляр оружия (возможно, вам понадобится анимацию броска)
    const thrownWeapon = this.physics.add.sprite(playerX, playerY, 'pistolIdle');

    // Установите скорость броска оружия
    const throwSpeed = 400;

    // Нормализуйте направление броска и установите его скорость
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    const velocityX = (directionX / length) * throwSpeed;
    const velocityY = (directionY / length) * throwSpeed;

    // Установите скорость броска для оружия
    thrownWeapon.setVelocity(velocityX, velocityY);

    // Удалите оружие из руки игрока
    player.pistol = null;

    // Удалите оружие из сцены через определенное время (например, 2 секунды)
    this.time.delayedCall(2000, () => {
      thrownWeapon.destroy();
    });
  }
}

function onPickupWeapon(player, weapon) {
  
  pistol = weapon;
  pistol.setDepth(2)
  pistol.x = player.x; // Установите пистолет в руках игрока
  pistol.y = player.y; // Установите пистолет в руках игрока
  player.pistol = pistol; // Присвойте пистолет игроку для последующей работы с ним
}


function addPistol(self) {
  self.pistol = this.add.sprite(100, 100, 'pistolSprite');
  
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
    self.otherPlayers.add(otherPlayer);
    
  }
}