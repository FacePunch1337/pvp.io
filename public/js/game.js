var config = {
  type: Phaser.AUTO,
  parent: 'pvp.io',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 300 }
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
let speed = 2;
let self;


function preload() {
  this.load.spritesheet('playerIdle', 'assets/player/idle.png', { frameWidth: 40, frameHeight: 40 });
  this.load.spritesheet('playerMove', 'assets/player/run.png', { frameWidth: 40, frameHeight: 40 });
  this.load.spritesheet('pistolShoot', 'assets/weapone/pistol/pistol.png', { frameWidth: 64, frameHeight: 32 });
  //this.load.spritesheet('pistolIdle', 'assets/weapone/pistol/pistolidle.png', { frameWidth: 64, frameHeight: 32 });
  this.load.image('pistolIdle', 'assets/weapone/pistol/pistolidle.png');
  this.load.image('customCursor', 'assets/aim.png');

   
  
}

function create() {
 

  self = this;
  this.socket = io();
  player = this.add.sprite(100, 100, 'playerIdle');
  //player = this.physics.add.sprite(100, 100, 'playerIdle');
  document.body.style.cursor = 'none';
  this.customCursor = this.add.image(0, 0, 'customCursor');
  this.customCursor.setOrigin(0, 0);
  this.customCursor.setScale(0.3);
  this.customCursor.setDepth(1);

  this.input.on('pointermove', (pointer) => {
    self.customCursor.x = pointer.x;
    self.customCursor.y = pointer.y;
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

  this.pistolShootAnim= this.anims.create({
    key: 'pistol_shoot',
    frames: this.anims.generateFrameNumbers('pistolShoot', { start: 0, end: 12 }),
    frameRate: 10,
    repeat: -1,
  });
  this.pistolIdleAnim = this.anims.create({
    key: 'pistol_idle',
    frames: this.anims.generateFrameNumbers('pistolIdle', { start: 0, end: 12 }),
    frameRate: 10,
    repeat: -1,
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
  this.socket.on('weaponeLocation', function (weaponeLocation) {
    if (self.weapone) self.weapone.destroy();
    self.weapone = self.add.image(Phaser.Math.Between(100, 800), Phaser.Math.Between(100, 600), 'pistolIdle');
    self.weapone.setOrigin(0.5, 0.5);
    self.weapone.setDepth(0);
    self.physics.add.overlap(self.player, self.weapon, function () {
      this.socket.emit('weaponeTakes');
    }, null, self);
  });

  
}

function calculateFlipX(player, cursor) {
  var angle = Phaser.Math.Angle.Between(player.x, player.y, cursor.x, cursor.y);
  return angle > Math.PI / 2 || angle < -Math.PI / 2;
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

 /* var weaponeX = weapone.y;
  var weaponeY = weapone.y;*/

  

  player.setFlipX(calculateFlipX(player, self.customCursor));
  //this.socket.emit('weaponeCoords', { weaponeX: this.weapone.x, weaponeY: this.weapone.y, rotation: this.weapone.rotation });
  // Проверьте, если клавиша "E" нажата, и если да, то выполните подбор оружия
  if (Phaser.Input.Keyboard.JustDown(self.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E))) {
    onPickupWeapon(player, pistol)
  }
   
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

function onPickupWeapon(player, weapon) {
  
  console.log(player + "pickUp" + weapon);
}


function addPistol(self) {
  self.pistol = this.add.sprite(100, 100, 'pistolShoot');
  
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