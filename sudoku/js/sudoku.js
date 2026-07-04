let gridSize = 3;
let board = [];
let solution = [];
let selectedCell = null;
let mistakes = 0;
let maxMistakes = 3;
let timer = 0;
let timerInterval = null;
let soundEnabled = true;

// Audio Context untuk generate suara
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Fungsi untuk memainkan suara
function playSound(type) {
    if (!soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'correct') {
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'wrong') {
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } else if (type === 'win') {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.3);
            osc.start(audioContext.currentTime + i * 0.15);
            osc.stop(audioContext.currentTime + i * 0.15 + 0.3);
        });
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundBtn');
    btn.textContent = soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF';
    btn.style.background = soundEnabled ? '#48bb78' : '#f56565';
}

function updateGridSize() {
    gridSize = parseInt(document.getElementById('gridSize').value);
    generatePuzzle();
}

function generatePuzzle() {
    clearInterval(timerInterval);
    timer = 0;
    mistakes = 0;
    updateTimer();
    updateMistakes();
    
    const size = gridSize * gridSize;
    board = Array(size).fill().map(() => Array(size).fill(0));
    solution = Array(size).fill().map(() => Array(size).fill(0));
    
    generateSolution();
    createPuzzle();
    renderGrid();
    
    timerInterval = setInterval(() => {
        timer++;
        updateTimer();
    }, 1000);
    
    document.getElementById('gameMessage').className = 'game-message';
}

function generateSolution() {
    const size = gridSize * gridSize;
    fillGrid(solution, size);
}

function fillGrid(grid, size) {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] === 0) {
                const numbers = shuffleArray(Array.from({length: size}, (_, i) => i + 1));
                for (let num of numbers) {
                    if (isValid(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (fillGrid(grid, size)) {
                            return true;
                        }
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(grid, row, col, num) {
    const size = gridSize * gridSize;
    
    for (let x = 0; x < size; x++) {
        if (grid[row][x] === num || grid[x][col] === num) {
            return false;
        }
    }
    
    const startRow = Math.floor(row / gridSize) * gridSize;
    const startCol = Math.floor(col / gridSize) * gridSize;
    
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[startRow + i][startCol + j] === num) {
                return false;
            }
        }
    }
    
    return true;
}

function createPuzzle() {
    const size = gridSize * gridSize;
    const difficulty = document.getElementById('difficulty').value;
    let cellsToRemove = 0;
    
    if (difficulty === 'easy') cellsToRemove = size * size * 0.3;
    else if (difficulty === 'medium') cellsToRemove = size * size * 0.5;
    else cellsToRemove = size * size * 0.7;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            board[i][j] = solution[i][j];
        }
    }
    
    while (cellsToRemove > 0) {
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        
        if (board[row][col] !== 0) {
            board[row][col] = 0;
            cellsToRemove--;
        }
    }
}

function renderGrid() {
    const grid = document.getElementById('sudokuGrid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${gridSize * gridSize}, 1fr)`;
    
    const size = gridSize * gridSize;
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            if (board[i][j] !== 0) {
                cell.textContent = board[i][j];
                cell.classList.add('fixed');
            }
            
            cell.onclick = () => selectCell(cell, i, j);
            
            if (j % gridSize === 0 && j !== 0) {
                cell.style.borderLeft = '3px solid #2d3748';
            }
            if (i % gridSize === 0 && i !== 0) {
                cell.style.borderTop = '3px solid #2d3748';
            }
            
            grid.appendChild(cell);
        }
    }
}

function selectCell(cell, row, col) {
    document.querySelectorAll('.sudoku-cell').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    selectedCell = { row, col, element: cell };
}

function inputNumber(num) {
    if (!selectedCell) return;
    
    const { row, col, element } = selectedCell;
    
    if (element.classList.contains('fixed')) return;
    
    if (num === 0) {
        board[row][col] = 0;
        element.textContent = '';
        element.classList.remove('error', 'correct');
        return;
    }
    
    board[row][col] = num;
    element.textContent = num;
    
    if (solution[row][col] === num) {
        element.classList.remove('error');
        element.classList.add('correct');
        playSound('correct');
        
        if (checkWin()) {
            clearInterval(timerInterval);
            playSound('win');
            showMessage('Congratulations! You solved the puzzle!', 'success');
        }
    } else {
        element.classList.remove('correct');
        element.classList.add('error');
        playSound('wrong');
        mistakes++;
        updateMistakes();
        
        if (mistakes >= maxMistakes) {
            clearInterval(timerInterval);
            showMessage('Game Over! Too many mistakes.', 'error');
        }
    }
}

function checkWin() {
    const size = gridSize * gridSize;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (board[i][j] !== solution[i][j]) {
                return false;
            }
        }
    }
    return true;
}

function updateTimer() {
    const minutes = Math.floor(timer / 60).toString().padStart(2, '0');
    const seconds = (timer % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function updateMistakes() {
    document.getElementById('mistakes').textContent = `${mistakes}/${maxMistakes}`;
}

function showMessage(text, type) {
    const msg = document.getElementById('gameMessage');
    msg.textContent = text;
    msg.className = `game-message ${type}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

window.onload = () => {
    generatePuzzle();
};
