/* =========================================
   1. SOUND SYSTEM (MERDU & CHILL SYNTHWAVE)
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
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    playTone: function(freq, type, duration, vol = 0.1, slide = 0) {
        if (this.isMuted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(freq + slide, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    // SFX
    shoot: function() { this.playTone(440, 'triangle', 0.1, 0.05, 200); },
    hit: function() { this.playTone(100, 'sawtooth', 0.2, 0.1); },
    jump: function() { this.playTone(200, 'sine', 0.3, 0.1, 300); },

    // MUSIK MERDU (Chords: Am - F - C - G)
    startMusic: function() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        this.noteIndex = 0;
        this.bgmInterval = setInterval(() => {
            const step = this.noteIndex % 16;
            // Bass merdu
            const chords = [220, 174, 261, 196]; // A, F, C, G
            if (step % 4 === 0) {
                this.playTone(chords[Math.floor(step/4)] / 2, 'sine', 0.8, 0.15);
            }
            // Melody Chill
            const melody = [440, 0, 493, 523, 0, 440, 392, 0, 349, 0, 392, 440, 0, 329, 349, 0];
            if (melody[step] > 0) {
                this.playTone(melody[step], 'triangle', 0.4, 0.04);
            }
            this.noteIndex++;
        }, 200);
    },
    stopMusic: function() { clearInterval(this.bgmInterval); }
};

/* =========================================
   2. GAME ENGINE
   ========================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameRunning = false;
let score = 0;
let frames = 0;

// Objek Mobil Pemain
class Car {
    constructor() {
        this.w = 80;
        this.h = 40;
        this.x = 50;
        this.y = canvas.height / 2;
        this.dy = 0;
        this.dx = 0;
        this.hp = 100;
        this.isJumping = false;
        this.jumpV = 0;
    }

    draw() {
        ctx.save();
        // Efek Lompat (Bayangan & Ukuran)
        let jumpOffset = this.isJumping ? Math.sin(this.jumpV) * 20 : 0;
        ctx.translate(this.x, this.y - jumpOffset);

        // --- MENGGAMBAR MOBIL ASLI ---
        // Body Bawah
        ctx.fillStyle = "#1a1a1a"; // Hitam Ninja
        ctx.fillRect(0, 10, this.w, 25);
        // Body Atas (Kaca)
        ctx.fillStyle = "#3498db"; 
        ctx.fillRect(20, 0, 40, 15);
        // Roda
        ctx.fillStyle = "#000";
        ctx.fillRect(10, 30, 15, 10);
        ctx.fillRect(55, 30, 15, 10);
        // Lampu Depan
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.w - 5, 15, 5, 10);
        // Garis Ninja (Merah)
        ctx.fillStyle = "red";
        ctx.fillRect(0, 20, this.w, 3);

        ctx.restore();
    }

    update() {
        this.y += this.dy;
        this.x += this.dx;

        // Batas Atas Bawah
        if (this.y < 50) this.y = 50;
        if (this.y > canvas.height - 150) this.y = canvas.height - 150;
        if (this.x < 10) this.x = 10;
        if (this.x > canvas.width / 2) this.x = canvas.width / 2;

        // Logika Lompat
        if (this.isJumping) {
            this.jumpV += 0.1;
            if (this.jumpV >= Math.PI) {
                this.isJumping = false;
                this.jumpV = 0;
            }
        }
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            SoundSystem.jump();
        }
    }
}

// Objek Rintangan (Mobil Maling)
class Obstacle {
    constructor() {
        this.w = 70;
        this.h = 35;
        this.x = canvas.width + 100;
        this.y = 50 + Math.random() * (canvas.height - 200);
        this.speed = 5 + (score / 50);
        this.color = "#c0392b";
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.fillStyle = "black";
        ctx.fillRect(this.x + 5, this.y + 28, 12, 10);
        ctx.fillRect(this.x + 53, this.y + 28, 12, 10);
    }

    update() {
        this.x -= this.speed;
    }
}

let player = new Car();
let obstacles = [];
let roadOffset = 0;

function init() {
    SoundSystem.init();
    SoundSystem.startMusic();
    player = new Car();
    obstacles = [];
    score = 0;
    frames = 0;
    gameRunning = true;
    animate();
}

function animate() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gambaran Jalan Raya
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 50, canvas.width, canvas.height - 150);
    // Garis Jalan Putus-putus
    ctx.fillStyle = "white";
    roadOffset -= 10;
    if (roadOffset <= -100) roadOffset = 0;
    for (let i = 0; i < canvas.width + 100; i += 100) {
        ctx.fillRect(i + roadOffset, canvas.height / 2 - 5, 50, 5);
    }

    player.update();
    player.draw();

    // Spawn Musuh
    if (frames % 80 === 0) obstacles.push(new Obstacle());

    obstacles.forEach((obs, index) => {
        obs.update();
        obs.draw();

        // Cek Tabrakan (Hanya jika tidak sedang melompat tinggi)
        if (!player.isJumping || player.jumpV < 0.5 || player.jumpV > 2.5) {
            if (player.x < obs.x + obs.w && player.x + player.w > obs.x &&
                player.y < obs.y + obs.h && player.y + player.h > obs.y) {
                endGame();
            }
        }

        if (obs.x + obs.w < 0) {
            obstacles.splice(index, 1);
            score += 10;
            document.getElementById('score').innerText = score;
        }
    });

    frames++;
    requestAnimationFrame(animate);
}

function endGame() {
    gameRunning = false;
    SoundSystem.stopMusic();
    SoundSystem.hit();
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

/* =========================================
   3. CONTROLS (KONTAK KONSOL HP)
   ========================================= */
const joystickArea = document.getElementById('joystick-area');
const attackBtn = document.getElementById('attack-btn');
attackBtn.innerText = "UP"; // Kita ganti jadi tombol lompat

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
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            // Visual Joystick
            document.getElementById('joystick-knob').style.transform = 
                `translate(calc(-50% + ${Math.max(-40, Math.min(40, dx))}px), calc(-50% + ${Math.max(-40, Math.min(40, dy))}px))`;

            // Gerak Mobil
            player.dx = dx / 10;
            player.dy = dy / 10;
        }
    }
}, { passive: false });

joystickArea.addEventListener('touchend', () => {
    player.dx = 0;
    player.dy = 0;
    document.getElementById('joystick-knob').style.transform = `translate(-50%, -50%)`;
});

attackBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    player.jump();
});

// PC Support
window.addEventListener('keydown', (e) => {
    if (e.key === "ArrowUp") player.dy = -5;
    if (e.key === "ArrowDown") player.dy = 5;
    if (e.key === "ArrowLeft") player.dx = -5;
    if (e.key === "ArrowRight") player.dx = 5;
    if (e.key === " ") player.jump();
});
window.addEventListener('keyup', () => { player.dx = 0; player.dy = 0; });

document.getElementById('start-btn').onclick = () => {
    document.getElementById('start-screen').classList.add('hidden');
    init();
};
document.getElementById('restart-btn').onclick = () => {
    document.getElementById('game-over-screen').classList.add('hidden');
    init();
};
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();
