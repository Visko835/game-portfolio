// Global variables
let currentUser = null;
let userData = null;
let gameRunning = false;
let gamePaused = false;
let animationFrame = null;

// Game state
let player = null;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let explosions = [];
let powerups = [];
let score = 0;
let lives = 3;
let wave = 1;
let waveTimer = 0;
let bossActive = false;
let boss = null;

// Pixel editor state
let editorGrid = [];
let currentTool = 'add';
let editorPixelSize = 25;
let previewScale = 12;

// Audio context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'square') {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

// Simple hash function for password security
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Encode/Decode data for localStorage
function encodeData(data) {
    const json = JSON.stringify(data);
    return btoa(json).split('').reverse().join('');
}

function decodeData(encoded) {
    try {
        const json = atob(encoded.split('').reverse().join(''));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// User management
function switchTab(tab) {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.remove('active');
    
    document.getElementById(`${tab}Form`).classList.add('active');
    document.getElementById(`${tab}Tab`).classList.add('active');
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const messageEl = document.getElementById('regMessage');
    
    if (!username || !password) {
        messageEl.textContent = 'Please fill all fields';
        messageEl.className = 'message error';
        return;
    }
    
    if (password !== confirm) {
        messageEl.textContent = 'Passwords do not match';
        messageEl.className = 'message error';
        return;
    }
    
    if (password.length < 4) {
        messageEl.textContent = 'Password must be at least 4 characters';
        messageEl.className = 'message error';
        return;
    }
    
    const users = decodeData(localStorage.getItem('users')) || {};
    
    if (users[username]) {
        messageEl.textContent = 'Username already exists';
        messageEl.className = 'message error';
        return;
    }
    
    users[username] = {
        password: simpleHash(password),
        points: 0,
        planeDesign: getDefaultPlane(),
        weapons: ['basic'],
        equippedWeapons: ['basic'],
        weaponPositions: [{x: 8, y: 12}]
    };
    
    localStorage.setItem('users', encodeData(users));
    
    messageEl.textContent = 'Registration successful!';
    messageEl.className = 'message success';
    
    setTimeout(() => {
        switchTab('login');
        document.getElementById('loginUsername').value = username;
    }, 1000);
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    
    if (!username || !password) {
        messageEl.textContent = 'Please fill all fields';
        messageEl.className = 'message error';
        return;
    }
    
    const users = decodeData(localStorage.getItem('users')) || {};
    
    if (!users[username]) {
        messageEl.textContent = 'User not found';
        messageEl.className = 'message error';
        return;
    }
    
    if (users[username].password !== simpleHash(password)) {
        messageEl.textContent = 'Incorrect password';
        messageEl.className = 'message error';
        return;
    }
    
    currentUser = username;
    userData = users[username];
    
    messageEl.textContent = 'Login successful!';
    messageEl.className = 'message success';
    
    setTimeout(() => {
        showScreen('menuScreen');
        updateMenuInfo();
    }, 500);
}

function logout() {
    currentUser = null;
    userData = null;
    showScreen('loginScreen');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginMessage').textContent = '';
}

function updateMenuInfo() {
    document.getElementById('currentUser').textContent = currentUser;
    document.getElementById('userPoints').textContent = userData.points;
    document.getElementById('shopPoints').textContent = userData.points;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Default plane design (16x16 grid)
function getDefaultPlane() {
    const grid = Array(16).fill().map(() => Array(16).fill(null));
    
    // Nose
    grid[7][6] = '#ff0000';
    grid[8][6] = '#ff0000';
    
    // Cockpit
    grid[6][7] = '#00aaff';
    grid[7][7] = '#00aaff';
    grid[8][7] = '#00aaff';
    grid[9][7] = '#00aaff';
    
    // Body
    for (let i = 5; i <= 10; i++) {
        grid[i][8] = '#ff0000';
    }
    
    // Wings
    for (let i = 3; i <= 12; i++) {
        grid[i][9] = '#ff0000';
    }
    grid[2][9] = '#ff0000';
    grid[13][9] = '#ff0000';
    
    // Tail
    grid[5][10] = '#ff0000';
    grid[10][10] = '#ff0000';
    grid[6][11] = '#ff0000';
    grid[9][11] = '#ff0000';
    grid[7][11] = '#ff0000';
    grid[8][11] = '#ff0000';
    
    // Tail wings
    grid[4][12] = '#ff0000';
    grid[11][12] = '#ff0000';
    grid[5][12] = '#ff0000';
    grid[10][12] = '#ff0000';
    
    return grid;
}

// Plane Customizer
function openCustomizer() {
    editorGrid = userData.planeDesign.map(row => [...row]);
    renderEditor();
    updatePreview();
}

function renderEditor() {
    const canvas = document.getElementById('planeEditor');
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 16; i++) {
        ctx.beginPath();
        ctx.moveTo(i * editorPixelSize, 0);
        ctx.lineTo(i * editorPixelSize, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * editorPixelSize);
        ctx.lineTo(canvas.width, i * editorPixelSize);
        ctx.stroke();
    }
    
    // Draw pixels
    let pixelCount = 0;
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            if (editorGrid[y][x]) {
                ctx.fillStyle = editorGrid[y][x];
                ctx.fillRect(x * editorPixelSize, y * editorPixelSize, editorPixelSize, editorPixelSize);
                pixelCount++;
            }
        }
    }
    
    document.getElementById('pixelCount').textContent = pixelCount;
}

function updatePreview() {
    const canvas = document.getElementById('planePreview');
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            if (editorGrid[y][x]) {
                ctx.fillStyle = editorGrid[y][x];
                ctx.fillRect(x * previewScale, y * previewScale, previewScale, previewScale);
            }
        }
    }
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tool${tool.charAt(0).toUpperCase() + tool.slice(1)}`).classList.add('active');
}

function clearPlane() {
    editorGrid = Array(16).fill().map(() => Array(16).fill(null));
    renderEditor();
    updatePreview();
}

function resetPlane() {
    editorGrid = getDefaultPlane();
    renderEditor();
    updatePreview();
}

function validatePlaneDesign() {
    let hasNose = false;
    let hasWings = false;
    let hasTail = false;
    let hasBody = false;
    
    // Check for nose (front)
    for (let y = 6; y <= 9; y++) {
        for (let x = 0; x < 6; x++) {
            if (editorGrid[y][x]) {
                hasNose = true;
                break;
            }
        }
    }
    
    // Check for wings (middle, extending out)
    let wingPixels = 0;
    for (let y = 0; y < 16; y++) {
        for (let x = 8; x < 12; x++) {
            if (editorGrid[y][x]) wingPixels++;
        }
    }
    hasWings = wingPixels > 5;
    
    // Check for tail (back)
    for (let y = 4; y <= 11; y++) {
        for (let x = 12; x < 16; x++) {
            if (editorGrid[y][x]) {
                hasTail = true;
                break;
            }
        }
    }
    
    // Check for body (center)
    for (let y = 5; y <= 10; y++) {
        if (editorGrid[y][7] || editorGrid[y][8]) {
            hasBody = true;
            break;
        }
    }
    
    return hasNose && hasWings && hasTail && hasBody;
}

function savePlaneDesign() {
    if (!validatePlaneDesign()) {
        alert('Invalid plane design! Must have nose, wings, tail, and body.');
        return;
    }
    
    userData.planeDesign = editorGrid.map(row => [...row]);
    saveUserData();
    alert('Plane design saved!');
    showScreen('menuScreen');
}

// Editor mouse handling
document.getElementById('planeEditor').addEventListener('mousedown', function(e) {
    const rect = this.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / editorPixelSize);
    const y = Math.floor((e.clientY - rect.top) / editorPixelSize);
    
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    
    if (currentTool === 'add') {
        editorGrid[y][x] = document.getElementById('pixelColor').value;
    } else if (currentTool === 'remove') {
        editorGrid[y][x] = null;
    } else if (currentTool === 'color') {
        if (editorGrid[y][x]) {
            editorGrid[y][x] = document.getElementById('pixelColor').value;
        }
    }
    
    renderEditor();
    updatePreview();
});

// Weapon Shop
const WEAPONS = {
    basic: { name: 'Basic Gun', price: 0, damage: 1, fireRate: 200, color: '#ffff00' },
    double: { name: 'Double Shot', price: 100, damage: 1, fireRate: 150, color: '#00ff00' },
    triple: { name: 'Triple Spread', price: 200, damage: 1, fireRate: 180, color: '#ff00ff' },
    laser: { name: 'Laser Beam', price: 300, damage: 2, fireRate: 100, color: '#00ffff' },
    missile: { name: 'Missile', price: 500, damage: 5, fireRate: 500, color: '#ff8800' },
    plasma: { name: 'Plasma Cannon', price: 1000, damage: 3, fireRate: 120, color: '#ff0088' }
};

function openShop() {
    renderShop();
    renderWeaponSlots();
}

function renderShop() {
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';
    
    Object.keys(WEAPONS).forEach(key => {
        const weapon = WEAPONS[key];
        const owned = userData.weapons.includes(key);
        
        const item = document.createElement('div');
        item.className = 'shop-item';
        
        const canvas = document.createElement('canvas');
        canvas.width = 60;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 60, 60);
        ctx.fillStyle = weapon.color;
        ctx.fillRect(25, 10, 10, 40);
        
        item.appendChild(canvas);
        
        const title = document.createElement('h4');
        title.textContent = weapon.name;
        item.appendChild(title);
        
        const price = document.createElement('div');
        price.className = 'price';
        price.textContent = owned ? 'OWNED' : `${weapon.price} pts`;
        item.appendChild(price);
        
        const btn = document.createElement('button');
        btn.textContent = owned ? 'Equip' : 'Buy';
        btn.disabled = !owned && userData.points < weapon.price;
        btn.onclick = () => owned ? equipWeapon(key) : buyWeapon(key);
        item.appendChild(btn);
        
        grid.appendChild(item);
    });
}

function buyWeapon(key) {
    const weapon = WEAPONS[key];
    if (userData.points < weapon.price) return;
    
    userData.points -= weapon.price;
    userData.weapons.push(key);
    saveUserData();
    renderShop();
    updateMenuInfo();
}

function equipWeapon(key) {
    if (!userData.equippedWeapons.includes(key)) {
        if (userData.equippedWeapons.length >= 3) {
            alert('Maximum 3 weapons equipped!');
            return;
        }
        userData.equippedWeapons.push(key);
        userData.weaponPositions.push({x: 8, y: 12});
    }
    saveUserData();
    renderWeaponSlots();
}

function renderWeaponSlots() {
    const slots = document.getElementById('weaponSlots');
    slots.innerHTML = '';
    
    userData.equippedWeapons.forEach((weaponKey, index) => {
        const weapon = WEAPONS[weaponKey];
        const slot = document.createElement('div');
        slot.className = 'slot equipped';
        slot.innerHTML = `
            <strong>${weapon.name}</strong>
            <br><small>Position: ${userData.weaponPositions[index].x},${userData.weaponPositions[index].y}</small>
            <br><button onclick="unequipWeapon(${index})">Unequip</button>
        `;
        slots.appendChild(slot);
    });
    
    for (let i = userData.equippedWeapons.length; i < 3; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.textContent = 'Empty Slot';
        slots.appendChild(slot);
    }
}

function unequipWeapon(index) {
    userData.equippedWeapons.splice(index, 1);
    userData.weaponPositions.splice(index, 1);
    saveUserData();
    renderWeaponSlots();
}

function saveUserData() {
    const users = decodeData(localStorage.getItem('users')) || {};
    users[currentUser] = userData;
    localStorage.setItem('users', encodeData(users));
}

// Game Engine
function startGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    score = 0;
    lives = 3;
    wave = 1;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    explosions = [];
    powerups = [];
    bossActive = false;
    boss = null;
    
    player = {
        x: canvas.width / 2 - 40,
        y: canvas.height - 100,
        width: 80,
        height: 80,
        speed: 5,
        lastShot: 0,
        design: userData.planeDesign
    };
    
    gameRunning = true;
    gamePaused = false;
    document.getElementById('gameOverScreen').classList.remove('active');
    
    updateHUD();
    gameLoop();
    spawnWave();
}

function gameLoop() {
    if (!gameRunning) return;
    
    if (!gamePaused) {
        update();
        render();
    }
    
    animationFrame = requestAnimationFrame(gameLoop);
}

function update() {
    const canvas = document.getElementById('gameCanvas');
    
    // Update bullets
    bullets = bullets.filter(b => {
        b.y -= b.speed;
        return b.y > -b.height;
    });
    
    // Update enemy bullets
    enemyBullets = enemyBullets.filter(b => {
        b.y += b.speed;
        return b.y < canvas.height;
    });
    
    // Update enemies
    enemies.forEach(enemy => {
        enemy.y += enemy.speed;
        enemy.x += Math.sin(enemy.y * 0.02) * 2;
        
        if (Date.now() - enemy.lastShot > enemy.fireRate) {
            enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 10,
                speed: 5,
                color: '#ff0000'
            });
            enemy.lastShot = Date.now();
        }
    });
    
    enemies = enemies.filter(e => e.y < canvas.height + 50);
    
    // Update boss
    if (boss) {
        boss.x += boss.speed;
        if (boss.x <= 0 || boss.x >= canvas.width - boss.width) {
            boss.speed *= -1;
        }
        
        if (Date.now() - boss.lastShot > boss.fireRate) {
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push({
                    x: boss.x + boss.width / 2 + i * 20,
                    y: boss.y + boss.height,
                    width: 6,
                    height: 12,
                    speed: 6,
                    color: '#ff00ff'
                });
            }
            boss.lastShot = Date.now();
        }
    }
    
    // Update explosions
    explosions = explosions.filter(exp => {
        exp.frame++;
        return exp.frame < exp.maxFrames;
    });
    
    // Collision detection
    checkCollisions();
    
    // Spawn new wave
    if (enemies.length === 0 && !bossActive) {
        waveTimer++;
        if (waveTimer > 60) {
            wave++;
            spawnWave();
            waveTimer = 0;
        }
    }
}

function checkCollisions() {
    // Bullets vs enemies
    bullets.forEach((bullet, bi) => {
        enemies.forEach((enemy, ei) => {
            if (checkCollision(bullet, enemy)) {
                bullets.splice(bi, 1);
                enemy.hp -= bullet.damage;
                
                if (enemy.hp <= 0) {
                    explosions.push({
                        x: enemy.x,
                        y: enemy.y,
                        width: enemy.width,
                        height: enemy.height,
                        frame: 0,
                        maxFrames: 20
                    });
                    enemies.splice(ei, 1);
                    score += enemy.points;
                    playSound(200, 0.2);
                    updateHUD();
                }
            }
        });
        
        // Bullets vs boss
        if (boss && checkCollision(bullet, boss)) {
            bullets.splice(bi, 1);
            boss.hp -= bullet.damage;
            
            if (boss.hp <= 0) {
                explosions.push({
                    x: boss.x,
                    y: boss.y,
                    width: boss.width,
                    height: boss.height,
                    frame: 0,
                    maxFrames: 30
                });
                score += boss.points;
                boss = null;
                bossActive = false;
                playSound(100, 0.5);
                updateHUD();
            }
        }
    });
    
    // Enemy bullets vs player
    enemyBullets.forEach((bullet, bi) => {
        if (checkCollision(bullet, player)) {
            enemyBullets.splice(bi, 1);
            lives--;
            playSound(150, 0.3);
            updateHUD();
            
            if (lives <= 0) {
                gameOver();
            }
        }
    });
    
    // Enemies vs player
    enemies.forEach((enemy, ei) => {
        if (checkCollision(enemy, player)) {
            explosions.push({
                x: enemy.x,
                y: enemy.y,
                width: enemy.width,
                height: enemy.height,
                frame: 0,
                maxFrames: 20
            });
            enemies.splice(ei, 1);
            lives--;
            playSound(150, 0.3);
            updateHUD();
            
            if (lives <= 0) {
                gameOver();
            }
        }
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 137 + Date.now() * 0.05) % canvas.width;
        const y = (i * 211 + Date.now() * 0.1) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
    }
    
    // Draw player
    drawPixelPlane(ctx, player.x, player.y, player.width, player.height, player.design);
    
    // Draw bullets
    bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    
    // Draw enemies
    enemies.forEach(e => {
        drawPixelEnemy(ctx, e.x, e.y, e.width, e.height, e.type);
    });
    
    // Draw boss
    if (boss) {
        drawPixelBoss(ctx, boss.x, boss.y, boss.width, boss.height);
        
        // Boss health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 100, 50, 200, 20);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(canvas.width / 2 - 100, 50, 200 * (boss.hp / boss.maxHp), 20);
    }
    
    // Draw enemy bullets
    enemyBullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    
    // Draw explosions
    explosions.forEach(exp => {
        const alpha = 1 - exp.frame / exp.maxFrames;
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.fillRect(exp.x, exp.y, exp.width, exp.height);
    });
}

function drawPixelPlane(ctx, x, y, width, height, design) {
    const pixelSize = width / 16;
    
    for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 16; col++) {
            if (design[row][col]) {
                ctx.fillStyle = design[row][col];
                ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

function drawPixelEnemy(ctx, x, y, width, height, type) {
    ctx.fillStyle = type === 1 ? '#ff4444' : type === 2 ? '#ff8800' : '#ff00ff';
    
    // Simple pixel enemy
    const pixelSize = width / 8;
    const pattern = [
        [0,0,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,0],
        [1,1,0,1,1,0,1,1],
        [1,1,1,1,1,1,1,1],
        [0,1,0,1,1,0,1,0],
        [1,0,0,0,0,0,0,1],
        [0,1,0,0,0,0,1,0],
        [0,0,1,0,0,1,0,0]
    ];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (pattern[row][col]) {
                ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

function drawPixelBoss(ctx, x, y, width, height) {
    ctx.fillStyle = '#ff00ff';
    
    const pixelSize = width / 16;
    const pattern = [
        [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
        [0,1,1,1,0,0,1,1,1,1,0,0,1,1,1,0],
        [1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1],
        [1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
        [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0]
    ];
    
    for (let row = 0; row < pattern.length; row++) {
        for (let col = 0; col < pattern[row].length; col++) {
            if (pattern[row][col]) {
                ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

function spawnWave() {
    const canvas = document.getElementById('gameCanvas');
    
    if (wave % 5 === 0) {
        // Boss wave
        bossActive = true;
        boss = {
            x: canvas.width / 2 - 80,
            y: 50,
            width: 160,
            height: 120,
            speed: 2,
            hp: 50 + wave * 10,
            maxHp: 50 + wave * 10,
            lastShot: 0,
            fireRate: 1000,
            points: 500
        };
    } else {
        // Regular wave
        const enemyCount = 5 + wave * 2;
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                if (!gameRunning) return;
                
                const type = Math.ceil(Math.random() * 3);
                enemies.push({
                    x: Math.random() * (canvas.width - 40),
                    y: -50 - i * 50,
                    width: 40,
                    height: 40,
                    speed: 1 + Math.random() * 2,
                    hp: type,
                    type: type,
                    lastShot: Date.now() + Math.random() * 2000,
                    fireRate: 2000 - wave * 100,
                    points: type * 10
                });
            }, i * 500);
        }
    }
    
    updateHUD();
}

function updateHUD() {
    document.getElementById('gameScore').textContent = score;
    document.getElementById('gameLives').textContent = lives;
    document.getElementById('gameWave').textContent = wave;
}

function pauseGame() {
    gamePaused = !gamePaused;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationFrame);
    
    const earnedPoints = Math.floor(score / 10);
    userData.points += earnedPoints;
    saveUserData();
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('earnedPoints').textContent = earnedPoints;
    document.getElementById('gameOverScreen').classList.add('active');
}

// Player controls
const keys = {};
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    
    if (gameRunning && !gamePaused) {
        const canvas = document.getElementById('gameCanvas');
        
        if (e.key === 'ArrowLeft' && player.x > 0) {
            player.x -= player.speed;
        }
        if (e.key === 'ArrowRight' && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
        if (e.key === 'ArrowUp' && player.y > canvas.height / 2) {
            player.y -= player.speed;
        }
        if (e.key === 'ArrowDown' && player.y < canvas.height - player.height) {
            player.y += player.speed;
        }
        
        if (e.key === ' ') {
            shoot();
        }
    }
});

document.addEventListener('keyup', e => {
    keys[e.key] = false;
});

function shoot() {
    const now = Date.now();
    
    userData.equippedWeapons.forEach((weaponKey, index) => {
        const weapon = WEAPONS[weaponKey];
        
        if (now - player.lastShot > weapon.fireRate) {
            const pos = userData.weaponPositions[index];
            const pixelSize = player.width / 16;
            
            bullets.push({
                x: player.x + pos.x * pixelSize,
                y: player.y + pos.y * pixelSize,
                width: 4,
                height: 10,
                speed: 10,
                damage: weapon.damage,
                color: weapon.color
            });
            
            playSound(800, 0.1);
            player.lastShot = now;
        }
    });
}

// Auto-shoot
setInterval(() => {
    if (gameRunning && !gamePaused) {
        shoot();
    }
}, 100);
