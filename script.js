/* --- SETUP CANVAS & VARIABLES --- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hpDisplay = document.getElementById('player-hp');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const joystickKnob = document.getElementById('joystick-knob');

// Game State
let gameRunning = false;
let score = 0;
let frames = 0;
let gameSpeed = 3;

// Assets (Placeholder Logic inside Drawing)
const assets = {
    player: new Image(),
    enemy: new Image(),
    bg: new Image()
};
// Uncomment baris di bawah jika gambar sudah ada di folder assets
// assets.player.src = 'assets/player.png';
// assets.enemy.src = 'assets/enemy.png';
// assets.bg.src = 'assets/bg.png';

/* --- CLASSES --- */

class Player {
    constructor() {
        this.w = 50; // Lebar
        this.h = 50; // Tinggi
        this.x = 100;
        this.y = canvas.height - 150;
        this.dy = 0; // Kecepatan vertikal
        this.dx = 0; // Kecepatan horizontal
        this.jumpPower = -15;
        this.gravity = 0.8;
        this.groundY = canvas.height - 100; // Posisi tanah
        this.hp = 100;
        this.color = '#333'; // Warna ninja (hitam)
    }

    update() {
        // Logika Lompat & Gravitasi
        this.y += this.dy;
        if (this.y + this.h < this.groundY) {
            this.dy += this.gravity;
        } else {
            this.dy = 0;
            this.y = this.groundY - this.h;
        }

        // Logika Gerak Kiri/Kanan
        this.x += this.dx;
        
        // Batas Layar
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width / 2) this.x = canvas.width / 2; // Maksimal setengah layar
    }

    draw() {
        // Jika ada gambar, pakai gambar. Jika tidak, pakai kotak.
        if (assets.player.complete && assets.player.naturalHeight !== 0) {
            ctx.drawImage(assets.player, this.x, this.y, this.w, this.h);
        } else {
            // Gambar Ninja (Kotak Hitam + Ikat Kepala Merah)
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y + 10, this.w, 10); // Ikat kepala
        }
    }

    jump() {
        if (this.y + this.h >= this.groundY) {
            this.dy = this.jumpPower;
        }
    }
}

class Enemy {
    constructor() {
        this.w = 50;
        this.h = 50;
        this.x = canvas.width + Math.random() * 200; // Spawn di luar layar kanan
        this.y = canvas.height - 100 - this.h;
        this.speed = (Math.random() * 2) + gameSpeed;
        this.hp = 20;
        this.color = '#8B0000'; // Merah tua (Maling)
        this.markedForDeletion = false;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.w < 0) this.markedForDeletion = true;
    }

    draw() {
        if (assets.enemy.complete && assets.enemy.naturalHeight !== 0) {
            ctx.drawImage(assets.enemy, this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            // Mata musuh
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 10, this.y + 10, 10, 10);
            ctx.fillRect(this.x + 30, this.y + 10, 10, 10);
        }
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 5;
        this.speed = 10;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.speed;
        if (this.x > canvas.width) this.markedForDeletion = true;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700'; // Warna Shuriken (Emas)
        ctx.fill();
        ctx.closePath();
    }
}

class Background {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.width = canvas.width;
        this.height = canvas.height;
        this.speed = 1; // Kecepatan parallax
    }
    
    update() {
        this.x -= this.speed;
        if (this.x <= -this.width) this.x = 0;
    }
    
    draw() {
        // Gambar tanah
        ctx.fillStyle = '#654321';
        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
        
        // Rumput
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, canvas.height - 110, canvas.width, 10);
    }
}

/* --- GAME LOGIC --- */

let player = new Player();
let enemies = [];
let projectiles = [];
let bg = new Background();

function init() {
    resizeCanvas();
    player = new Player();
    enemies = [];
    projectiles = [];
    score = 0;
    gameSpeed = 3;
    frames = 0;
    hpDisplay.innerText = player.hp;
    scoreDisplay.innerText = score;
    gameRunning = true;
    animate();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(player) player.groundY = canvas.height - 100;
}

window.addEventListener('resize', resizeCanvas);

function spawnEnemy() {
    if (frames % 120 === 0) { // Spawn tiap 2 detik (kurang lebih)
        enemies.push(new Enemy());
    }
}

function checkCollisions() {
    // Projectile vs Enemy
    projectiles.forEach((proj, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (
                proj.x < enemy.x + enemy.w &&
                proj.x + proj.r > enemy.x &&
                proj.y < enemy.y + enemy.h &&
                proj.y + proj.r > enemy.y
            ) {
                // Kena hit
                enemy.hp -= 10;
                proj.markedForDeletion = true;
                if (enemy.hp <= 0) {
                    enemy.markedForDeletion = true;
                    score += 10;
                    scoreDisplay.innerText = score;
                }
            }
        });
    });

    // Player vs Enemy
    enemies.forEach(enemy => {
        if (
            player.x < enemy.x + enemy.w &&
            player.x + player.w > enemy.x &&
            player.y < enemy.y + enemy.h &&
            player.y + player.h > enemy.y
        ) {
            player.hp -= 1; // Darah berkurang
            hpDisplay.innerText = player.hp;
            if (player.hp <= 0) endGame();
        }
    });
}

function endGame() {
    gameRunning = false;
    finalScoreDisplay.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background Update
    bg.update();
    bg.draw();

    // Player Update
    player.update();
    player.draw();

    // Projectiles
    projectiles.forEach(p => {
        p.update();
        p.draw();
    });
    projectiles = projectiles.filter(p => !p.markedForDeletion);

    // Enemies
    spawnEnemy();
    enemies.forEach(e => {
        e.update();
        e.draw();
    });
    enemies = enemies.filter(e => !e.markedForDeletion);

    checkCollisions();
    
    frames++;
    requestAnimationFrame(animate);
}

/* --- INPUT & CONTROLS --- */

// Keyboard Support (untuk testing di PC)
window.addEventListener('keydown', e => {
    if (e.code === 'ArrowRight') player.dx = 5;
    if (e.code === 'ArrowLeft') player.dx = -5;
    if (e.code === 'ArrowUp') player.jump();
    if (e.code === 'Space') {
        projectiles.push(new Projectile(player.x + player.w, player.y + player.h / 2));
    }
});

window.addEventListener('keyup', e => {
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') player.dx = 0;
});

// TOUCH CONTROLS (Virtual Stick & Button)
const joystickArea = document.getElementById('joystick-area');
const attackBtn = document.getElementById('attack-btn');

// Joystick Logic
let touchId = null;
let startX, startY;

joystickArea.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    startX = touch.clientX;
    startY = touch.clientY;
}, { passive: false });

joystickArea.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
            const touch = e.changedTouches[i];
            const diffX = touch.clientX - startX;
            const diffY = touch.clientY - startY;

            // Gerakan Visual Knob
            const limit = 40;
            const moveX = Math.max(-limit, Math.min(limit, diffX));
            const moveY = Math.max(-limit, Math.min(limit, diffY));
            joystickKnob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

            // Logika Gerak Player
            if (diffX > 20) player.dx = 5;
            else if (diffX < -20) player.dx = -5;
            else player.dx = 0;

            // Logika Lompat (Stick ke atas)
            if (diffY < -30) player.jump();
        }
    }
}, { passive: false });

joystickArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    player.dx = 0;
    joystickKnob.style.transform = `translate(-50%, -50%)`; // Reset knob
}, { passive: false });

// Attack Button Logic
attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameRunning) {
        projectiles.push(new Projectile(player.x + player.w, player.y + player.h / 2));
    }
}, { passive: false });

/* --- BUTTON HANDLERS --- */
document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.classList.add('hidden');
    init();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    init();
});
