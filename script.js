/* =========================================
   1. SOUND SYSTEM (WEB AUDIO API - MUSIC & SFX)
   ========================================= */
const SoundSystem = {
    ctx: null,
    isMuted: false,
    bgmInterval: null,
    noteIndex: 0,

    init: function() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Fungsi dasar membuat nada
    playTone: function(freq, type, duration, vol = 0.1, slide = 0) {
        if (this.isMuted || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        if (slide !== 0) {
            osc.frequency.exponentialRampToValueAtTime(freq + slide, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    /* --- SFX (EFEK SUARA) --- */
    jump: function() { this.playTone(300, 'sine', 0.2, 0.1, 100); },
    shoot: function() { this.playTone(600, 'square', 0.1, 0.05, -300); },
    hit: function() { this.playTone(150, 'sawtooth', 0.1, 0.1, -50); },
    explosion: function() {
        this.playTone(100, 'sawtooth', 0.4, 0.2, -80);
        setTimeout(() => this.playTone(60, 'square', 0.4, 0.2, -40), 50);
    },
    gameOver: function() {
        this.stopMusic();
        this.playTone(400, 'triangle', 0.5, 0.2, -100);
        setTimeout(() => this.playTone(300, 'triangle', 0.8, 0.2, -100), 400);
        setTimeout(() => this.playTone(200, 'triangle', 1.5, 0.2, -100), 800);
    },

    /* --- BGM (MUSIK LATAR) --- */
    startMusic: function() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        if (this.isMuted) return;

        this.noteIndex = 0;
        // Tempo: 150ms per beat (Cepat ala Ninja)
        this.bgmInterval = setInterval(() => {
            this.playMusicStep();
        }, 150); 
    },

    stopMusic: function() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        this.bgmInterval = null;
    },

    playMusicStep: function() {
        if (this.isMuted || !this.ctx) return;

        // Pola Bassline (A Minor: A - G - F - E)
        const bassNotes = [220, 220, 196, 196, 174, 174, 164, 164]; 
        // Pola Melody (Arpeggio Ninja)
        const leadNotes = [440, 0, 523, 0, 659, 523, 440, 0, 392, 0, 440, 523, 392, 0, 330, 0];

        const step = this.noteIndex % 16;
        
        // Mainkan Bass (setiap 2 step)
        if (step % 2 === 0) {
            const bassFreq = bassNotes[(step / 2) % bassNotes.length];
            this.playTone(bassFreq / 2, 'triangle', 0.2, 0.15); // Bass lebih rendah
        }

        // Mainkan Melody
        const leadFreq = leadNotes[step];
        if (leadFreq > 0) {
            this.playTone(leadFreq, 'square', 0.1, 0.03); // Melody tipis
        }

        this.noteIndex++;
    },

    toggleMute: function() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopMusic();
            return "🔇 Off";
        } else {
            if (gameRunning) this.startMusic();
            return "🔊 On";
        }
    }
};

/* =========================================
   2. GAME SETUP & VARIABLES
   ========================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hpDisplay = document.getElementById('player-hp');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const joystickKnob = document.getElementById('joystick-knob');
const soundBtn = document.getElementById('sound-toggle');

// Game State
let gameRunning = false;
let score = 0;
let frames = 0;
let gameSpeed = 3;

// Assets Holder
const assets = {
    player: new Image(),
    enemy: new Image(),
    bg: new Image()
};
// Optional: assets.player.src = 'assets/player.png';

/* =========================================
   3. CLASSES (ENTITIES)
   ========================================= */

class Player {
    constructor() {
        this.w = 50; 
        this.h = 50;
        this.x = 50;
        this.y = canvas.height - 150;
        this.dy = 0;
        this.dx = 0;
        this.jumpPower = -15;
        this.gravity = 0.8;
        this.groundY = canvas.height - 100;
        this.hp = 100;
        this.color = '#111'; 
    }

    update() {
        // Fisika Lompat
        this.y += this.dy;
        if (this.y + this.h < this.groundY) {
            this.dy += this.gravity;
        } else {
            this.dy = 0;
            this.y = this.groundY - this.h;
        }

        // Gerak Kiri/Kanan
        this.x += this.dx;
        
        // Batas Layar
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.w) this.x = canvas.width - this.w;
    }

    draw() {
        if (assets.player.complete && assets.player.naturalHeight !== 0) {
            ctx.drawImage(assets.player, this.x, this.y, this.w, this.h);
        } else {
            // Gambar Ninja Default (Kotak Hitam + Bandana Merah)
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            
            // Bandana
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y + 10, this.w, 8);
            if (this.dx > 0) ctx.fillRect(this.x - 10, this.y + 10, 10, 8); // Tali bandana
            
            // Mata
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 35, this.y + 12, 10, 4);
        }
    }

    jump() {
        if (this.y + this.h >= this.groundY) {
            this.dy = this.jumpPower;
            SoundSystem.jump();
        }
    }
}

class Enemy {
    constructor() {
        this.w = 50;
        this.h = 50;
        this.x = canvas.width + Math.random() * 200;
        this.y = canvas.height - 100 - this.h;
        this.speed = (Math.random() * 3) + gameSpeed;
        this.hp = 20;
        this.color = '#8B0000'; // Merah (Musuh)
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
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 20, 5, 0, Math.PI*2);
            ctx.arc(this.x + 35, this.y + 20, 5, 0, Math.PI*2);
            ctx.fill();
        }
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.r = 6;
        this.speed = 12;
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.speed;
        if (this.x > canvas.width) this.markedForDeletion = true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(frames * 0.2); // Efek putar
        ctx.fillStyle = '#FFD700'; // Emas
        // Gambar Shuriken (Bintang 4 Sisi)
        ctx.beginPath();
        for(let i=0; i<4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(0, 0);
            ctx.lineTo(10, 5);
            ctx.lineTo(0, 0);
        }
        ctx.fill();
        ctx.restore();
    }
}

class Background {
    constructor() {
        this.x = 0;
        this.width = canvas.width;
        this.speed = 1; 
    }
    
    update() {
        this.x -= this.speed;
        if (this.x <= -this.width) this.x = 0;
    }
    
    draw() {
        // Langit
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Matahari
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(canvas.width - 100, 100, 40, 0, Math.PI * 2);
        ctx.fill();

        // Tanah (Parallax sederhana)
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(this.x, canvas.height - 100, this.width, 100);
        ctx.fillRect(this.x + this.width, canvas.height - 100, this.width, 100);
        
        // Rumput
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(this.x, canvas.height - 110, this.width, 10);
        ctx.fillRect(this.x + this.width, canvas.height - 110, this.width, 10);
    }
}

/* =========================================
   4. GAME LOGIC
   ========================================= */

let player = new Player();
let enemies = [];
let projectiles = [];
let bg = new Background();

function init() {
    SoundSystem.init();
    SoundSystem.startMusic(); // Mulai Musik!
    
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
    if(bg) bg.width = canvas.width;
}
window.addEventListener('resize', resizeCanvas);

function spawnEnemy() {
    // Makin lama makin sering muncul
    let interval = 120;
    if (score > 50) interval = 90;
    if (score > 100) interval = 60;

    if (frames % interval === 0) {
        enemies.push(new Enemy());
    }
}

function checkCollisions() {
    // Projectile vs Enemy
    projectiles.forEach((proj) => {
        enemies.forEach((enemy) => {
            if (!proj.markedForDeletion && !enemy.markedForDeletion &&
                proj.x < enemy.x + enemy.w &&
                proj.x + proj.r > enemy.x &&
                proj.y < enemy.y + enemy.h &&
                proj.y + proj.r > enemy.y
            ) {
                enemy.hp -= 10;
                proj.markedForDeletion = true;
                SoundSystem.hit();
                
                if (enemy.hp <= 0) {
                    enemy.markedForDeletion = true;
                    score += 10;
                    scoreDisplay.innerText = score;
                    SoundSystem.explosion();
                }
            }
        });
    });

    // Player vs Enemy
    enemies.forEach(enemy => {
        if (!enemy.markedForDeletion &&
            player.x < enemy.x + enemy.w &&
            player.x + player.w > enemy.x &&
            player.y < enemy.y + enemy.h &&
            player.y + player.h > enemy.y
        ) {
            player.hp -= 1;
            hpDisplay.innerText = player.hp;
            if (frames % 10 === 0) SoundSystem.hit(); // Efek suara kena damage

            if (player.hp <= 0) endGame();
        }
    });
}

function endGame() {
    gameRunning = false;
    SoundSystem.gameOver();
    finalScoreDisplay.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    bg.update();
    bg.draw();

    player.update();
    player.draw();

    projectiles.forEach(p => { p.update(); p.draw(); });
    projectiles = projectiles.filter(p => !p.markedForDeletion);

    spawnEnemy();
    enemies.forEach(e => { e.update(); e.draw(); });
    enemies = enemies.filter(e => !e.markedForDeletion);

    checkCollisions();
    
    frames++;
    requestAnimationFrame(animate);
}

/* =========================================
   5. CONTROLS (INPUT)
   ========================================= */

// Keyboard (PC)
window.addEventListener('keydown', e => {
    if (!gameRunning) return;
    if (e.code === 'ArrowRight') player.dx = 5;
    if (e.code === 'ArrowLeft') player.dx = -5;
    if (e.code === 'ArrowUp') player.jump();
    if (e.code === 'Space') {
        projectiles.push(new Projectile(player.x + player.w, player.y + player.h / 2));
        SoundSystem.shoot();
    }
});

window.addEventListener('keyup', e => {
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') player.dx = 0;
});

// UI Buttons
document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.classList.add('hidden');
    init();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    init();
});

// Sound Toggle
if(soundBtn) {
    soundBtn.addEventListener('click', () => {
        soundBtn.innerText = SoundSystem.toggleMute();
    });
}

// TOUCH CONTROLS (Mobile)
const joystickArea = document.getElementById('joystick-area');
const attackBtn = document.getElementById('attack-btn');
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

            // Visual Knob
            const limit = 40;
            const moveX = Math.max(-limit, Math.min(limit, diffX));
            const moveY = Math.max(-limit, Math.min(limit, diffY));
            joystickKnob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

            // Logic Movement
            if (diffX > 20) player.dx = 5;
            else if (diffX < -20) player.dx = -5;
            else player.dx = 0;

            if (diffY < -30) player.jump();
        }
    }
}, { passive: false });

joystickArea.addEventListener('touchend', (e) => {
    e.preventDefault();
    player.dx = 0;
    joystickKnob.style.transform = `translate(-50%, -50%)`;
}, { passive: false });

attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameRunning) {
        projectiles.push(new Projectile(player.x + player.w, player.y + player.h / 2));
        SoundSystem.shoot();
    }
}, { passive: false });
