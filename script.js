// --- OYUN AYARLARI ---
const canvasLocal = document.getElementById('tetris-local');
const ctxLocal = canvasLocal.getContext('2d');
const canvasRemote = document.getElementById('tetris-remote');
const ctxRemote = canvasRemote.getContext('2d');

ctxLocal.scale(20, 20);
ctxRemote.scale(20, 20);

const pieces = 'ILJOTSZ';
const colors = [
    null,
    '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'
];

// --- P2P BAĞLANTI (PeerJS) ---
let peer = null;
let conn = null;
let myId = null;

const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const roomInput = document.getElementById('room-input');
const roomInfo = document.getElementById('room-info');
const myRoomCodeSpan = document.getElementById('my-room-code');
const connStatus = document.getElementById('connection-status');
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');

function generateShortId() {
    // Rastgele 4 karakterlik bir oda kodu oluştur
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// PeerJS Başlatma
myId = generateShortId();
peer = new Peer(myId);

peer.on('open', (id) => {
    myId = id;
    console.log('My ID:', id);
    connStatus.innerText = "Sunucuya bağlandı. Oda kurabilirsin.";
    connStatus.style.color = "#0DFF72";
    createBtn.innerText = "ODA OLUŞTUR";
    createBtn.disabled = false;
});

peer.on('connection', (c) => {
    // Başkası bize bağlandı (Host biziz)
    conn = c;
    setupConnection();
});

peer.on('error', (err) => {
    console.error(err);
    alert("Bağlantı Hatası: " + err.type);
});

// Buton Olayları
roomInput.addEventListener('input', (e) => {
    joinBtn.disabled = e.target.value.length < 3;
});

createBtn.addEventListener('click', () => {
    createBtn.style.display = 'none';
    document.querySelector('.divider-text').style.display = 'none';
    roomInput.style.display = 'none';
    joinBtn.style.display = 'none';
    roomInfo.style.display = 'block';
    myRoomCodeSpan.innerText = myId;
});

joinBtn.addEventListener('click', () => {
    const destId = roomInput.value.toUpperCase().trim();
    if (!destId) return;
    conn = peer.connect(destId);
    setupConnection();
});

function setupConnection() {
    conn.on('open', () => {
        console.log("Bağlantı kuruldu!");
        startGameUI();
    });
    conn.on('data', handleData);
    conn.on('close', () => {
        alert("Bağlantı koptu!");
        location.reload();
    });
}

function handleData(data) {
    if (data.type === 'BOARD_UPDATE') {
        drawRemote(data.matrix); 
        document.getElementById('opponent-score').innerText = data.score;
    } else if (data.type === 'READY') {
        document.getElementById('game-status').innerText = "Rakip Hazır!";
        opponentReady = true;
        checkStart();
    } else if (data.type === 'GAME_OVER') {
        gameRunning = false;
        showResult("KAZANDIN!", "Rakip elendi.");
    }
}

// --- TETRIS MANTIĞI ---

function createPiece(type) {
    if (type === 'I') return [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]];
    if (type === 'L') return [[0, 2, 0], [0, 2, 0], [0, 2, 2]];
    if (type === 'J') return [[0, 3, 0], [0, 3, 0], [3, 3, 0]];
    if (type === 'O') return [[4, 4], [4, 4]];
    if (type === 'Z') return [[5, 5, 0], [0, 5, 5], [0, 0, 0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'T') return [[0, 7, 0], [7, 7, 7], [0, 0, 0]];
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    arena: createMatrix(12, 20)
};

function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                // Basit bir gölge efekti
                ctx.lineWidth = 0.1;
                ctx.strokeStyle = 'white';
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    ctxLocal.fillStyle = '#000';
    ctxLocal.fillRect(0, 0, canvasLocal.width, canvasLocal.height);
    drawMatrix(player.arena, { x: 0, y: 0 }, ctxLocal);
    drawMatrix(player.matrix, player.pos, ctxLocal);
}

function drawRemote(arenaMatrix) {
    ctxRemote.fillStyle = '#000';
    ctxRemote.fillRect(0, 0, canvasRemote.width, canvasRemote.height);
    if (arenaMatrix) {
        drawMatrix(arenaMatrix, { x: 0, y: 0 }, ctxRemote);
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerDrop() {
    player.pos.y++;
    if (collide(player.arena, player)) {
        player.pos.y--;
        merge(player.arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        broadcastState(); 
    }
    dropCounter = 0;
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(player.arena, player)) {
        player.pos.x -= offset;
    }
}

function playerReset() {
    const p = 'ILJOTSZ';
    player.matrix = createPiece(p[p.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (player.arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(player.arena, player)) {
        gameRunning = false;
        if(conn) conn.send({ type: 'GAME_OVER' });
        showResult("KAYBETTİN", "Oyun bitti.");
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(player.arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = player.arena.length - 1; y > 0; --y) {
        for (let x = 0; x < player.arena[y].length; ++x) {
            if (player.arena[y][x] === 0) continue outer;
        }
        const row = player.arena.splice(y, 1)[0].fill(0);
        player.arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;
    }
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

function broadcastState() {
    if (!conn) return;
    // Arena + Aktif parça birleşimi gönder
    const tempArena = player.arena.map(row => [...row]);
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0 && y + player.pos.y < 20) {
                tempArena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });

    conn.send({
        type: 'BOARD_UPDATE',
        matrix: tempArena,
        score: player.score
    });
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameRunning = false;

function update(time = 0) {
    if (!gameRunning) return;
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
        broadcastState();
    }
    draw();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    if (!gameRunning) return;
    if (event.keyCode === 37) { playerMove(-1); broadcastState(); }
    else if (event.keyCode === 39) { playerMove(1); broadcastState(); }
    else if (event.keyCode === 40) { playerDrop(); }
    else if (event.keyCode === 38) { playerRotate(1); broadcastState(); }
});

// Oyun Yönetimi
let amIReady = false;
let opponentReady = false;

function startGameUI() {
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
}

document.getElementById('ready-btn').addEventListener('click', () => {
    amIReady = true;
    const btn = document.getElementById('ready-btn');
    btn.disabled = true;
    btn.innerText = "Bekleniyor...";
    btn.style.background = "#555";
    conn.send({ type: 'READY' });
    checkStart();
});

function checkStart() {
    if (amIReady && opponentReady) {
        document.getElementById('game-status').innerText = "BAŞLIYOR...";
        setTimeout(() => {
            document.getElementById('game-status').innerText = "";
            gameRunning = true;
            playerReset();
            updateScore();
            update();
        }, 1000);
    }
}

function showResult(title, msg) {
    const overlay = document.getElementById('overlay');
    document.getElementById('result-text').innerText = title;
    document.getElementById('result-subtext').innerText = msg;
    overlay.style.display = 'flex';
}
