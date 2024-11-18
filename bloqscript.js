// Constants
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

// Game constants
const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const COLORS = [
  null, 'red', 'green', 'blue', 'orange', 'cyan', 'purple', 'yellow'
];

// Tetromino shapes
const SHAPES = [
  [[1, 1, 1], [0, 1, 0]], // T-shape
  [[1, 1], [1, 1]],       // O-shape
  [[1, 1, 0], [0, 1, 1]], // S-shape
  [[0, 1, 1], [1, 1, 0]], // Z-shape
  [[1, 1, 1, 1]],         // I-shape
  [[1, 0, 0], [1, 1, 1]], // L-shape
  [[0, 0, 1], [1, 1, 1]], // J-shape
];

// Create the game board
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Current piece
let currentPiece = generatePiece();
let currentX = 4;
let currentY = 0;

// Game timing variables
let lastTime = 0;
let dropInterval = 1000; // Initial drop speed in milliseconds
let level = 1;

// Functions to draw the game
function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
  // Draw the grid
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) {
        drawBlock(x, y, COLORS[board[y][x]]);
      }
    }
  }
}

// Generate a random tetromino piece
function generatePiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return shape;
}

function drawPiece() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x]) {
        drawBlock(currentX + x, currentY + y, COLORS[currentPiece[y][x]]);
      }
    }
  }
}

// Collision detection
function checkCollision() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x]) {
        let newX = currentX + x;
        let newY = currentY + y;
        if (newX < 0 || newX >= COLS || newY >= ROWS || board[newY][newX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Place piece on the board
function placePiece() {
  for (let y = 0; y < currentPiece.length; y++) {
    for (let x = 0; x < currentPiece[y].length; x++) {
      if (currentPiece[y][x]) {
        board[currentY + y][currentX + x] = currentPiece[y][x];
      }
    }
  }
  clearLines();
  currentPiece = generatePiece();
  currentX = 4;
  currentY = 0;

  if (checkCollision()) {
    alert("Game Over!");
    resetGame();
  }
}

// Clear filled lines
function clearLines() {
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      y++;
    }
  }
}

// Rotate piece
function rotatePiece() {
  const rotated = currentPiece[0].map((_, index) => currentPiece.map(row => row[index])).reverse();
  const originalPiece = currentPiece;
  currentPiece = rotated;
  if (checkCollision()) {
    currentPiece = originalPiece;
  }
}

// Move piece down
function moveDown() {
  currentY++;
  if (checkCollision()) {
    currentY--;
    placePiece();
  }
}

// Move piece left/right
function moveLeft() {
  currentX--;
  if (checkCollision()) currentX++;
}

function moveRight() {
  currentX++;
  if (checkCollision()) currentX--;
}

// Detect mobile browser
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

// Handle mobile gestures
let startX, startY, endX, endY;
let lastTapTime = 0;

function handleMobileGestures() {
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.pageX;
    startY = touch.pageY;
  });

  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    endX = touch.pageX;
    endY = touch.pageY;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const currentTime = new Date().getTime();
    const timeDifference = currentTime - lastTapTime;

    // Double tap for restarting the game
    if (timeDifference < 300 && timeDifference > 0) {
      resetGame(); // Restart the game on double-tap
    }
    lastTapTime = currentTime;

    // Gesture-based controls:
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Swipe left/right
      if (deltaX < -30) {
        moveLeft(); // Shift left
      } else if (deltaX > 30) {
        moveRight(); // Shift right
      }
    } else {
      // Swipe up/down
      if (deltaY > 30) {
        placePiece(); // Auto place piece (Swipe Down)
      } else if (deltaY < -30) {
        rotatePiece(); // Rotate piece (Swipe Up)
      }
    }
  });
}

// Handle desktop controls (keyboard)
function handleDesktopControls() {
  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      moveLeft();
    } else if (event.key === 'ArrowRight') {
      moveRight();
    } else if (event.key === 'ArrowDown') {
      moveDown();
    } else if (event.key === 'ArrowUp') {
      rotatePiece();
    }
  });
}

// Game loop using requestAnimationFrame
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  // Update the game state based on time elapsed
  if (deltaTime > dropInterval) {
    moveDown();
  }

  // Clear canvas and redraw everything
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawPiece();

  requestAnimationFrame(gameLoop); // Continue the game loop
}

// Start the game
function resetGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  currentPiece = generatePiece();
  currentX = 4;
  currentY = 0;
  gameLoop(0); // Start the game loop
}

// Initialize controls based on device type
if (isMobile()) {
  handleMobileGestures(); // Handle mobile gestures
} else {
  handleDesktopControls(); // Handle desktop keyboard controls
}

resetGame(); // Initialize the game when page loads
