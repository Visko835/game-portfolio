// Chess pieces representation
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const PIECE_VALUES = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };

// Position tables for piece-square evaluation
const PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];

let board = [];
let selectedSquare = null;
let validMoves = [];
let currentPlayer = 'white';
let moveHistory = [];
let aiHelpEnabled = false;
let whiteScore = 0;
let blackScore = 0;
let lastMoveAnalysis = null;
let previousBoardState = null;

function initBoard() {
    board = [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R']
    ];
}

function newGame() {
    initBoard();
    selectedSquare = null;
    validMoves = [];
    currentPlayer = 'white';
    moveHistory = [];
    whiteScore = 0;
    blackScore = 0;
    lastMoveAnalysis = null;
    previousBoardState = null;
    renderBoard();
    updateScores();
    document.getElementById('moveHistory').innerHTML = '';
    document.getElementById('analysisContent').innerHTML = '<p>Make a move to see analysis</p>';
}

function renderBoard() {
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'chess-square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            
            if (board[row][col]) {
                square.textContent = PIECES[board[row][col]];
            }
            
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }
            
            if (validMoves.some(m => m.row === row && m.col === col)) {
                square.classList.add('valid-move');
            }
            
            square.onclick = () => handleSquareClick(row, col);
            boardEl.appendChild(square);
        }
    }
}

function handleSquareClick(row, col) {
    if (currentPlayer !== 'white') return;
    
    const piece = board[row][col];
    
    if (selectedSquare) {
        const move = validMoves.find(m => m.row === row && m.col === col);
        if (move) {
            makeMove(selectedSquare.row, selectedSquare.col, row, col);
            return;
        }
    }
    
    if (piece && isWhitePiece(piece)) {
        selectedSquare = { row, col };
        validMoves = getValidMoves(row, col, board);
        renderBoard();
    } else {
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
}

function isWhitePiece(piece) {
    return piece && piece === piece.toUpperCase();
}

function isBlackPiece(piece) {
    return piece && piece === piece.toLowerCase();
}

function getValidMoves(row, col, boardState) {
    const piece = boardState[row][col];
    if (!piece) return [];
    
    const moves = [];
    const isWhite = isWhitePiece(piece);
    const type = piece.toLowerCase();
    
    if (type === 'p') {
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        if (!boardState[row + direction]?.[col]) {
            moves.push({ row: row + direction, col });
            if (row === startRow && !boardState[row + 2 * direction]?.[col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }
        
        [-1, 1].forEach(dc => {
            const target = boardState[row + direction]?.[col + dc];
            if (target && ((isWhite && isBlackPiece(target)) || (!isWhite && isWhitePiece(target)))) {
                moves.push({ row: row + direction, col: col + dc });
            }
        });
    } else if (type === 'n') {
        const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        offsets.forEach(([dr, dc]) => {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = boardState[r][c];
                if (!target || (isWhite ? isBlackPiece(target) : isWhitePiece(target))) {
                    moves.push({ row: r, col: c });
                }
            }
        });
    } else if (type === 'b' || type === 'r' || type === 'q') {
        const directions = [];
        if (type === 'b' || type === 'q') directions.push([-1,-1],[-1,1],[1,-1],[1,1]);
        if (type === 'r' || type === 'q') directions.push([-1,0],[1,0],[0,-1],[0,1]);
        
        directions.forEach(([dr, dc]) => {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = boardState[r][c];
                if (!target) {
                    moves.push({ row: r, col: c });
                } else {
                    if ((isWhite && isBlackPiece(target)) || (!isWhite && isWhitePiece(target))) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        });
    } else if (type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr, c = col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const target = boardState[r][c];
                    if (!target || (isWhite ? isBlackPiece(target) : isWhitePiece(target))) {
                        moves.push({ row: r, col: c });
                    }
                }
            }
        }
    }
    
    return moves;
}

function makeMove(fromRow, fromCol, toRow, toCol) {
    previousBoardState = JSON.parse(JSON.stringify(board));
    const piece = board[fromRow][fromCol];
    const captured = board[toRow][toCol];
    
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    
    moveHistory.push({
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece,
        captured,
        player: currentPlayer
    });
    
    updateMoveHistory(piece, fromRow, fromCol, toRow, toCol, captured);
    
    selectedSquare = null;
    validMoves = [];
    
    if (currentPlayer === 'white') {
        analyzeMove(fromRow, fromCol, toRow, toCol, piece, captured);
        currentPlayer = 'black';
        renderBoard();
        updateScores();
        setTimeout(aiMove, 800);
    } else {
        currentPlayer = 'white';
        renderBoard();
        updateScores();
    }
}

function aiMove() {
    const move = findBestMove(board, 'black', 3);
    if (move) {
        makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
    }
}

function findBestMove(boardState, color, depth) {
    let bestMove = null;
    let bestScore = -Infinity;
    const allMoves = getAllMoves(boardState, color);
    
    for (const move of allMoves) {
        const newBoard = simulateMove(boardState, move);
        const score = minimax(newBoard, depth - 1, -Infinity, Infinity, color === 'black');
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

function minimax(boardState, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard(boardState);
    
    const color = isMaximizing ? 'black' : 'white';
    const moves = getAllMoves(boardState, color);
    
    if (moves.length === 0) {
        return isMaximizing ? -100000 : 100000;
    }
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const newBoard = simulateMove(boardState, move);
            const eval_ = minimax(newBoard, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, eval_);
            alpha = Math.max(alpha, eval_);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const newBoard = simulateMove(boardState, move);
            const eval_ = minimax(newBoard, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, eval_);
            beta = Math.min(beta, eval_);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getAllMoves(boardState, color) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (!piece) continue;
            if (color === 'white' && !isWhitePiece(piece)) continue;
            if (color === 'black' && !isBlackPiece(piece)) continue;
            
            const pieceMoves = getValidMoves(r, c, boardState);
            pieceMoves.forEach(m => {
                moves.push({ from: { row: r, col: c }, to: m });
            });
        }
    }
    return moves;
}

function simulateMove(boardState, move) {
    const newBoard = boardState.map(row => [...row]);
    newBoard[move.to.row][move.to.col] = newBoard[move.from.row][move.from.col];
    newBoard[move.from.row][move.from.col] = '';
    return newBoard;
}

function evaluateBoard(boardState) {
    let score = 0;
    let whitePosition = 0, blackPosition = 0;
    let whitePieces = 0, blackPieces = 0;
    let whiteThreats = 0, blackThreats = 0;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (!piece) continue;
            
            const value = PIECE_VALUES[piece.toLowerCase()];
            const tableIndex = r * 8 + c;
            
            if (isWhitePiece(piece)) {
                whitePieces += value;
                if (piece.toLowerCase() === 'p') whitePosition += PAWN_TABLE[tableIndex];
                else if (piece.toLowerCase() === 'n') whitePosition += KNIGHT_TABLE[tableIndex];
                
                const threats = getValidMoves(r, c, boardState).length;
                whiteThreats += threats * 5;
            } else {
                blackPieces += value;
                const mirrorIndex = (7 - r) * 8 + c;
                if (piece.toLowerCase() === 'p') blackPosition += PAWN_TABLE[mirrorIndex];
                else if (piece.toLowerCase() === 'n') blackPosition += KNIGHT_TABLE[mirrorIndex];
                
                const threats = getValidMoves(r, c, boardState).length;
                blackThreats += threats * 5;
            }
        }
    }
    
    score = (blackPieces + blackPosition + blackThreats) - (whitePieces + whitePosition + whiteThreats);
    
    whiteScore = whitePieces + whitePosition + whiteThreats;
    blackScore = blackPieces + blackPosition + blackThreats;
    
    return score;
}

function updateScores() {
    evaluateBoard(board);
    document.getElementById('whiteScore').textContent = whiteScore;
    document.getElementById('blackScore').textContent = blackScore;
    document.getElementById('positionScore').textContent = Math.abs(whiteScore - blackScore);
    document.getElementById('piecesScore').textContent = Math.floor((whiteScore + blackScore) / 2);
    document.getElementById('threatsScore').textContent = countThreats();
}

function countThreats() {
    let threats = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c]) threats += getValidMoves(r, c, board).length;
        }
    }
    return threats;
}

function analyzeMove(fromRow, fromCol, toRow, toCol, piece, captured) {
    const analysisEl = document.getElementById('analysisContent');
    let html = '';
    
    const currentEval = evaluateBoard(board);
    
    let bestMoveScore = -Infinity;
    let worstMoveScore = Infinity;
    let currentMoveScore = 0;
    
    const allMoves = getAllMoves(previousBoardState, 'white');
    for (const move of allMoves) {
        const newBoard = simulateMove(previousBoardState, move);
        const score = minimax(newBoard, 2, -Infinity, Infinity, false);
        if (score > bestMoveScore) bestMoveScore = score;
        if (score < worstMoveScore) worstMoveScore = score;
        
        if (move.from.row === fromRow && move.from.col === fromCol &&
            move.to.row === toRow && move.to.col === toCol) {
            currentMoveScore = score;
        }
    }
    
    let moveType = 'Good';
    let moveClass = 'best';
    const diff = bestMoveScore - currentMoveScore;
    
    if (diff === 0 && captured) {
        moveType = 'BRILLIANT!';
        moveClass = 'brilliant';
    } else if (diff === 0) {
        moveType = 'Best Move';
        moveClass = 'best';
    } else if (diff > 300) {
        moveType = 'Blunder';
        moveClass = 'blunder';
    } else if (diff > 150) {
        moveType = 'Mistake';
        moveClass = 'worst';
    } else if (diff > 50) {
        moveType = 'Inaccuracy';
        moveClass = 'worst';
    }
    
    html += `<div class="move-type ${moveClass}">${moveType}</div>`;
    html += `<p><strong>Eval:</strong> ${currentMoveScore > 0 ? '+' : ''}${(currentMoveScore/100).toFixed(2)}</p>`;
    html += `<p><strong>Captured:</strong> ${captured ? PIECES[captured] : 'None'}</p>`;
    
    const nextMoves = getAllMoves(board, 'black').slice(0, 3);
    if (nextMoves.length > 0) {
        html += `<p><strong>AI likely responds:</strong></p>`;
        nextMoves.forEach((m, i) => {
            const notation = `${String.fromCharCode(97 + m.from.col)}${8-m.from.row} → ${String.fromCharCode(97 + m.to.col)}${8-m.to.row}`;
            html += `<p>${i+1}. ${PIECES[board[m.from.row][m.from.col]]} ${notation}</p>`;
        });
    }
    
    analysisEl.innerHTML = html;
    lastMoveAnalysis = { type: moveType, score: currentMoveScore };
}

function updateMoveHistory(piece, fromRow, fromCol, toRow, toCol, captured) {
    const notation = `${PIECES[piece]} ${String.fromCharCode(97 + fromCol)}${8-fromRow}${captured ? 'x' : '-'}${String.fromCharCode(97 + toCol)}${8-toRow}`;
    const historyEl = document.getElementById('moveHistory');
    const moveDiv = document.createElement('div');
    moveDiv.className = 'move';
    moveDiv.textContent = `${moveHistory.length}. ${notation}`;
    historyEl.appendChild(moveDiv);
    historyEl.scrollTop = historyEl.scrollHeight;
}

function undoMove() {
    if (moveHistory.length < 2) return;
    
    for (let i = 0; i < 2; i++) {
        const last = moveHistory.pop();
        board[last.from.row][last.from.col] = last.piece;
        board[last.to.row][last.to.col] = last.captured || '';
    }
    
    currentPlayer = 'white';
    selectedSquare = null;
    validMoves = [];
    renderBoard();
    updateScores();
    
    const historyEl = document.getElementById('moveHistory');
    if (historyEl.lastChild) historyEl.removeChild(historyEl.lastChild);
    if (historyEl.lastChild) historyEl.removeChild(historyEl.lastChild);
}

function toggleAIHelp() {
    aiHelpEnabled = !aiHelpEnabled;
    const btn = document.getElementById('aiHelpBtn');
    btn.textContent = `AI Help: ${aiHelpEnabled ? 'ON' : 'OFF'}`;
    
    if (aiHelpEnabled && currentPlayer === 'white') {
        showBestMove();
    }
}

function showBestMove() {
    const move = findBestMove(board, 'white', 3);
    if (!move) return;
    
    document.querySelectorAll('.chess-square').forEach(sq => {
        if (parseInt(sq.dataset.row) === move.to.row && parseInt(sq.dataset.col) === move.to.col) {
            sq.classList.add('best-move');
        }
    });
    
    setTimeout(() => {
        document.querySelectorAll('.best-move').forEach(sq => sq.classList.remove('best-move'));
    }, 2000);
}

newGame();
