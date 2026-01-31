/* =========================================
   1. SOUND SYSTEM (SYNTHWAVE MERDU)
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

    startMusic: function() {
        if (this.bgmInterval) clearInterval(this.bgmInterval);
        this.noteIndex = 0;
        this.bgmInterval = setInterval(() => {
            const step = this.noteIndex % 16;
            // Bassline A - F - C - G (Lebih smooth)
            const chords = [220, 174, 261, 196]; 
            if (step % 4 === 0) {
                this.playTone(chords[Math.floor(step/4)] / 2, 'sine', 1.0, 0.12);
            }
            // Melody Arpeggio Merdu
            const melody = [440, 523, 659, 0, 523, 659, 783, 0, 392, 493, 587, 0, 440, 0, 329, 0];
            if (melody[step] > 0) {
                this.playTone(melody[step], 'triangle', 0.5, 0.03);
            }
            this.noteIndex++;
        }, 220); // Tempo sedikit lebih lambat agar terasa merdu
    },
    stopMusic: function() { clearInterval(this.bgmInterval); }
};

/* =========================================
   2. GAME ENGINE (NINJA RACER)
   ========================================= */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameRunning = false;
let score = 0;
let frames = 0;
let difficultyMultiplier = 1; // Untuk percepatan game

class Car {
    constructor() {
        this.w = 90; // Ukuran mobil diperbesar sedikit
        this.h = 45;
        this.x = 80;
        this.y = canvas.height / 2;
        this.dy = 0;
        this.dx = 0;
        this.isJumping = false;
        this.jumpV = 0;
        this.baseSpeed = 6;
    }

    draw() {
        ctx.save();
        let jumpOffset = this.isJumping ? Math.sin(this.jumpV) * 35 : 0;
        ctx.translate(this.x, this.y - jumpOffset);

        // Body Mobil Sporty
        ctx.fillStyle = "#111"; // Hitam Carbon
        ctx.fillRect(0, 10, this.w, 30);
        // Kaca Depan (Biru Langit)
        ctx.fillStyle = "#00d4ff";
        ctx.fillRect(this.w - 30, 15, 20, 15);
        // Lampu Depan Menyala
        ctx.fillStyle = "white";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "white";
        ctx.fillRect(this.w - 5, 12, 5, 8);
        ctx.fillRect(this.w - 5, 30, 5, 8);
        // Roda
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#333";
        ctx.fillRect(15, 35, 20, 12);
        ctx.fillRect(this.w - 35, 35, 20, 12);

        ctx.restore();
    }

    update() {
        // Kontrol sensitivitas diperbesar mengikuti console
        this.y += this.dy * 1.2;
        this.x += this.dx * 1.2;

        // Batas Jalan
        if (this.y < 60) this.y = 60;
        if (this.y > canvas.height - 160) this.y = canvas.height - 160;
        if (this.x < 20) this.x = 20;
        if (this.x > canvas.width / 1.5) this.x = canvas.width / 1.5;

        if (this.isJumping) {
            this.jumpV += 0.08; // Durasi lompat
            if (this.jumpV >= Math.PI) {
                this.isJumping = false;
                this.jumpV = 0;
            }
        }
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.playTone(300, 'sine', 0.2, 0.1, 200); // Suara lompat
        }
    }

    playTone(f, t, d, v, s) { SoundSystem.playTone(f, t, d, v, s); }
}

class Obstacle {
    constructor(speed) {
        this.w = 80;
        this.h = 40;
        this.x = canvas.width + 100;
        this.y = 70 + Math.random() * (canvas.height - 220);
        this.speed = speed;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        // Jendela musuh
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(this.x + 10, this.y + 10, 20, 20);
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
    difficultyMultiplier = 1; // Reset kecepatan ke awal (lambat)
    gameRunning = true;
    animate();
}

function animate() {
    if (!gameRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Kecepatan meningkat seiring waktu (Makin lama makin cepat)
    difficultyMultiplier += 0.0005; 
    let currentSpeed = 4 * difficultyMultiplier;

    // Background Jalan Raya
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 50, canvas.width, canvas.height - 150);
    
    // Garis Jalan Animasi
    ctx.fillStyle = "#555";
    roadOffset -= currentSpeed * 2;
    if (roadOffset <= -100) roadOffset = 0;
    for (let i = 0; i < canvas.width + 100; i += 100) {
        ctx.fillRect(i + roadOffset, canvas.height / 2 - 5, 60, 10);
    }

    player.update();
    player.draw();

    // Munculkan rintangan secara berkala (Makin cepat, makin sering muncul)
    let spawnRate = Math.max(30, 100 - Math.floor(difficultyMultiplier * 10));
    if (frames % spawnRate === 0) {
        obstacles.push(new Obstacle(currentSpeed + 2));
    }

    obstacles.forEach((obs, index) => {
        obs.update();
        obs.draw();

        // Hitbox Collision (Akurat)
        if (!player.isJumping || player.jumpV < 0.3 || player.jumpV > 2.8) {
            if (player.x < obs.x + obs.w - 10 && 
                player.x + player.w > obs.x + 10 &&
                player.y < obs.y + obs.h - 5 && 
                player.y + player.h > obs.y + 5) {
                endGame();
            }
        }

        // Skor & Bersihkan Musuh
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
    SoundSystem.playTone(100, 'sawtooth', 0.5, 0.2); // Suara tabrakan
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

/* =========================================
   3. KONTROL KONSOL (DIPERBESAR & RESPONSIF)
   ========================================= */
const joystickArea = document.getElementById('joystick-area');
const attackBtn = document.getElementById('attack-btn');
attackBtn.innerHTML = "<b>JUMP</b>";

let touchId = null;
let startX, startY;

// Memperbesar jangkauan kontrol joystick
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

            // Visual Knob dengan jangkauan lebih luas (60px)
            const limit = 60; 
            const moveX = Math.max(-limit, Math.min(limit, dx));
            const moveY = Math.max(-limit, Math.min(limit, dy));
            document.getElementById('joystick-knob').style.transform = 
                `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;

            // Gerakan lebih lincah
            player.dx = moveX / 8;
            player.dy = moveY / 8;
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
    if (e.key === "ArrowUp") player.dy = -7;
    if (e.key === "ArrowDown") player.dy = 7;
    if (e.key === "ArrowLeft") player.dx = -7;
    if (e.key === "ArrowRight") player.dx = 7;
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
