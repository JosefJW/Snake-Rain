let blockSize = 40;
let total_row = 25;  // number of rows
let total_col = 15;  // number of columns
let board, context;

// Starting position of the snake head (this will be reset when a new snake spawns)
let snakeX = blockSize * 5;
let snakeY = blockSize * 5;

// Constant gravity: the snake falls 1 block per tick by default.
const GRAVITY = 1;

// Variables for one-tick input (nudge)
let horizontalInput = 0;   // -1 for left, +1 for right, 0 for none.
let verticalInput = 0;     // -1 for upward nudge, +1 for downward nudge, 0 for none.

// When an arrow key is pressed, we set this flag so that gravity is paused during that tick.
let inputOverride = false;

// The snake’s body segments (each segment is an object with x and y properties)
let snakeBody = [];

// Landed blocks: once a snake piece lands, its blocks are added here.
// For snake blocks, we now store extra properties: shape and rotation.
let landedBlocks = [];

// Flag to indicate that the falling snake piece has landed.
let pieceLanded = false;

let gameOver = false;
let score = 0;
let rowMultiplier = 1;  // Multiplier for clearing multiple rows

// Set the movement tick rate (in milliseconds)
let moveInterval = 100;
let updateTimer;
let start = Date.now();

let ahh = new Audio("ahh2.mp3");
ahh.playbackRate = 2.5;
ahh.volume = 0.1;

let ouch = new Audio("ouch.mp3");
ouch.playbackRate = 2;

let backgroundMusic = new Audio("OnAPianoAcloudNatureSounds.mp3");
backgroundMusic.loop = true;

let endMusic = new Audio("everything-will-be-okay-happy-victory-stressed-out-outro-197188.mp3");

let highscore;

const startButton = document.getElementById("startButton");
startButton.addEventListener("click", startGame);

const playAgainButton = document.getElementById("playAgain");
playAgainButton.addEventListener("click", resetGame);

document.getElementById("toggleAhh").addEventListener("click", function() {
    ahh.muted = !ahh.muted;
});

document.getElementById("toggleOuch").addEventListener("click", function() {
    ouch.muted = !ouch.muted;
});

document.getElementById("toggleMusic").addEventListener("click", function() {
    backgroundMusic.muted = !backgroundMusic.muted;
    endMusic.muted = !endMusic.muted;
});

window.onload = function () {
  
  board = document.getElementById("board");
  board.height = total_row * blockSize;
  board.width = total_col * blockSize;
  context = board.getContext("2d");  

  highScore = localStorage.getItem("highScore");
  if (!highScore) {
    highScore = 0;
  }

  // Use keydown for immediate input response.
  document.addEventListener("keydown", changeDirection);
  update();
  playAgainButton.style.display = "none";
};

// Disable arrow key scrolling
window.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); // Prevents default action (scrolling)
    }
});

function startGame() {
    console.log("Start");
    gameOver = false;
    score = 0;
    snakeX = blockSize * 5;
    snakeY = blockSize * 5;
    snakeBody = [];
    landedBlocks = [];
    pieceLanded = false;
    moveInterval = 100;
  
    startButton.style.display = "none";
    playAgainButton.style.display = "none";
    backgroundMusic.loop = true;
    backgroundMusic.play();
    endMusic.pause();
  
    changeSpeed(moveInterval);
    ahh.play();
    backgroundMusic.play();
    update();
}

function resetGame() {
    startGame();
}

function changeSpeed(speed) {
  clearInterval(updateTimer);
  updateTimer = setInterval(update, speed);
}

function update() {
  if (gameOver) return;

  console.log(moveInterval);

  if (Date.now() - start > 10000 && moveInterval > 100) {
      moveInterval -= 10;
      start = Date.now();
      changeSpeed(moveInterval);
  }

  // Clear the board.
  context.fillStyle = "darkslategray";
  context.fillRect(0, 0, board.width, board.height);

  // Draw the score.
  context.fillStyle = "white";
  context.font = "20px Arial";
  context.fillText("Score: " + score, 10, 30);

  // Draw the high score.
  context.font = "20px Arial";
  context.fillText("High Score: " + highScore, 10, 60);

  // Draw the landed blocks.
  // If a block has a snake shape (stored in block.shape), draw it with our custom routine;
  // otherwise, draw as a plain rectangle.
  landedBlocks.forEach(block => {
      if (block.shape !== undefined) {
          drawLandedSnakeBlock(block);
      } else {
          context.fillStyle = block.color;
          context.fillRect(block.x, block.y, blockSize, blockSize);
      }
  });

  // If the falling piece has landed, spawn a new piece.
  if (pieceLanded) {
      spawnNewSnake();
      return;
  }

  // Determine effective movement.
  let effectiveHorizontal = horizontalInput;
  let effectiveVertical = inputOverride ? verticalInput : GRAVITY;

  // Calculate the next position for the head.
  let nextX = snakeX + effectiveHorizontal * blockSize;
  let nextY = snakeY + effectiveVertical * blockSize;

  // Boundary check for the snake’s head.
  if (nextX < 0 || nextX >= board.width || nextY < 0 || nextY >= board.height) {
      inputOverride = false;
      nextX = snakeX;
      nextY = snakeY + GRAVITY * blockSize;
  }

  // Check if ANY part of the snake collides.
  let willCollide = checkCollision(nextX, nextY) ||
      snakeBody.some(segment => checkCollision(segment.x, segment.y + effectiveVertical * blockSize));

  if (nextY >= board.height || willCollide) {
      // Convert the snake into landed blocks that store each segment’s shape.
      landSnake();
      clearFullRows();
      pieceLanded = true;
      return;
  }

  // Update positions.
  if (inputOverride) {
      // Shift snake's body.
      for (let i = snakeBody.length - 1; i > 0; i--) {
          snakeBody[i].x = snakeBody[i-1].x;
          snakeBody[i].y = snakeBody[i-1].y;
      }
      if (snakeBody.length > 0) {
          snakeBody[0].x = snakeX;
          snakeBody[0].y = snakeY;
      }
      // Update the snake’s head.
      snakeX = nextX;
      snakeY = nextY;
  } else {
      // Move snake downward.
      for (let i = snakeBody.length - 1; i >= 0; i--) {
          snakeBody[i].y = snakeBody[i].y + blockSize;
      }
      snakeX = nextX;
      snakeY = nextY;
  }

  // Draw the falling snake.
  drawActiveSnake();

  // Draw the eyes on the head.
  drawEyes(snakeX, snakeY);

  // After updating positions, check for any collisions.
  if (checkCollision(snakeX, snakeY)) {
      landSnake();
      clearFullRows();
      pieceLanded = true;
      return;
  }

  // Reset one-tick inputs.
  horizontalInput = 0;
  verticalInput = 0;
  inputOverride = false;
}

// ==============================================
// DRAWING FUNCTIONS
// ==============================================

// Helper: draw a rounded rectangle.
function drawRoundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x+radius, y);
  context.lineTo(x+width-radius, y);
  context.quadraticCurveTo(x+width, y, x+width, y+radius);
  context.lineTo(x+width, y+height-radius);
  context.quadraticCurveTo(x+width, y+height, x+width-radius, y+height);
  context.lineTo(x+radius, y+height);
  context.quadraticCurveTo(x, y+height, x, y+height-radius);
  context.lineTo(x, y+radius);
  context.quadraticCurveTo(x, y, x+radius, y);
  context.closePath();
  context.fill();
}

// Draw the falling snake in a connected, snake-like style.
function drawActiveSnake() {
  // Draw head first.
  context.save();
  // Draw body segments as connected pieces.
  for (let i = 0; i < snakeBody.length; i++) {
      let seg = snakeBody[i];
      context.fillStyle = seg.color;
      drawRoundedRect(seg.x + 2, seg.y + 2, blockSize - 4, blockSize - 4, 10);
  }
  context.fillStyle = "rgb(0, 220, 0)";
  // Draw a rounded rectangle that nearly fills the block.
  drawRoundedRect(snakeX + 2, snakeY + 2, blockSize - 4, blockSize - 4, 10);
  context.restore();
}

// Draw the snake’s eyes on the head.
function drawEyes(x, y) {
  const eyeSize = 6;
  const eyeOffsetX = blockSize / 4;
  const eyeOffsetY = blockSize / 4;

  // Left eye.
  context.fillStyle = "white";
  context.beginPath();
  context.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize, 0, 2 * Math.PI);
  context.fill();

  // Right eye.
  context.beginPath();
  context.arc(x + 3 * eyeOffsetX, y + eyeOffsetY, eyeSize, 0, 2 * Math.PI);
  context.fill();

  // Pupils.
  const pupilSize = 3;
  context.fillStyle = "black";
  context.beginPath();
  context.arc(x + eyeOffsetX, y + eyeOffsetY, pupilSize, 0, 2 * Math.PI);
  context.fill();
  context.beginPath();
  context.arc(x + 3 * eyeOffsetX, y + eyeOffsetY, pupilSize, 0, 2 * Math.PI);
  context.fill();
}

// ==============================================
// LANDING & SHAPE COMPUTATION
// ==============================================

// When the snake lands, convert its segments into landed blocks that "remember" their shape.
function landSnake() {
  // Build an array of all segments: head then body.
  let segments = [{ x: snakeX, y: snakeY, color: "rgb(0, 220, 0)" }].concat(snakeBody);
  // For each segment, compute its type.
  for (let i = 0; i < segments.length; i++) {
      let seg = segments[i];
      let shapeType;
      if (i === 0) {
          shapeType = "head";
      } else if (i === segments.length - 1) {
          shapeType = "tail";
      } else {
          // For all middle segments, treat them the same (“body”).
          shapeType = "body";
      }
    // Store the segment as a landed block with its shape.
    landedBlocks.push({
        x: seg.x,
        y: seg.y,
        shape: shapeType,
        color: seg.color
        // (We omit rotation now for simplicity.)
    });
  }
}

// ==============================================
// DRAWING LANDED SNAKE SEGMENTS
// ==============================================

// Draw a landed snake block with its stored shape.
function drawLandedSnakeBlock(block) {
  context.save();
  // Translate to the block's top-left (we don't apply rotation now for simplicity).
  // Draw different shapes based on segment type.
  if (block.shape === "head") {
      context.fillStyle = block.color;
      drawRoundedRect(block.x + 2, block.y + 2, blockSize - 4, blockSize - 4, 10);
  } else if (block.shape === "tail") {
      context.fillStyle = block.color;
      drawRoundedRect(block.x + 2, block.y + 2, blockSize - 4, blockSize - 4, 10);
  } else { // body segments (both straight and turns)
      context.fillStyle = block.color;
      drawRoundedRect(block.x + 2, block.y + 2, blockSize - 4, blockSize - 4, 10);
  }
  context.restore();
}

// ==============================================
// INPUT & COLLISION
// ==============================================

function changeDirection(e) {
  if (pieceLanded) return;

  if (e.code === "ArrowLeft") {
      horizontalInput = -1;
      inputOverride = true;
  } else if (e.code === "ArrowRight") {
      horizontalInput = 1;
      inputOverride = true;
  //} else if (e.code === "ArrowUp") {
  //    verticalInput = -1;
  //    inputOverride = true;
  } else if (e.code === "ArrowDown") {
      verticalInput = 1;
      inputOverride = true;
  }
}

function checkCollision(x, y) {
  if (y >= board.height) {
      return true;
  }
  return landedBlocks.some(block => block.x === x && block.y === y);
}

// ==============================================
// CLEARING ROWS (Red Block Behavior)
// ==============================================

// When a row is full, each non-red block in that row has a 10% chance to stick (turn red)
// and remain (and block dropping in that column); red blocks are always cleared.
function clearFullRows() {
    let rowsCleared = 0;
    // Process rows from bottom (highest index) to top.
    for (let row = total_row - 1; row >= 0; row--) {
      // Check if the row is full.
      let isRowFull = true;
      for (let col = 0; col < total_col; col++) {
        if (!landedBlocks.some(block => block.x === col * blockSize && block.y === row * blockSize)) {
          isRowFull = false;
          break;
        }
      }
      if (isRowFull) {
        rowsCleared++;
        // This set will record columns where a block "sticks" (turns red) so that blocks above in that column do NOT drop.
        let blockedCols = new Set();
        // Array to hold blocks that survive in this row.
        let survivors = [];
        // Process each column in the full row.
        for (let col = 0; col < total_col; col++) {
          // Find the block at this cell.
          let idx = landedBlocks.findIndex(block => block.x === col * blockSize && block.y === row * blockSize);
          if (idx !== -1) {
            let block = landedBlocks[idx];
            // Remove this block from the global list.
            landedBlocks.splice(idx, 1);
            if (block.color === "red") {
              // Red blocks are always cleared.
              // (Do not add them back.)
            } else {
              // For non-red blocks, roll a 10% chance to stick.
              if (Math.random() < 0.1) {
                block.color = "red";
                survivors.push(block);
                blockedCols.add(col);
              }
              // Otherwise, do not add it back (the block is removed).
            }
          }
        }
        // Add any survivors (the red blocks) back into the landedBlocks.
        landedBlocks.push(...survivors);
        
        // Now drop any blocks above this row in columns that are not blocked.
        for (let i = 0; i < landedBlocks.length; i++) {
          let block = landedBlocks[i];
          let colIndex = block.x / blockSize;
          if (block.y < row * blockSize && !blockedCols.has(colIndex)) {
            block.y += blockSize;
          }
        }
      }
    }
    score += rowsCleared * rowsCleared * 100;
  }
  

// ==============================================
// SPAWN NEW SNAKE
// ==============================================

function spawnNewSnake() {
  ouch.currentTime = 0;
  ouch.play();
  ahh.currentTime = 0;
  ahh.play();
  rowMultiplier = 1;
  let spawnLength = Math.floor(Math.random() * 5) + 3;
  let offset = Math.floor(Math.random() * 5);
  let spawnX = spawnLength * blockSize;
  let spawnY = 0;

  if (checkCollision(spawnX, spawnY)) {
      gameOver = true;
      gameOverSequence();
      return;
  }

  snakeX = spawnX + offset * blockSize;
  snakeY = spawnY;

  snakeBody = [];
  for (let i = 1; i < spawnLength; i++) {
      let segmentColor = `rgb(0, ${255 - Math.random()*50 - i*25}, 0)`;
      snakeBody.push({ x: spawnX - i * blockSize + offset * blockSize, y: spawnY, color: segmentColor });
  }

  pieceLanded = false;
}

function gameOverSequence() {
    clearInterval(updateTimer);
    context.fillStyle = "darkslategray";
    context.fillRect(0, 0, board.width, board.height);
    context.fillStyle = "white";
    context.font = "30px Arial";
    context.fillText("GAME OVER", board.width / 2 - 80, board.height / 2 - 15);
    context.font = "20px Arial";
    context.fillText("Final Score: " + score, board.width / 2 - 60, board.height / 2 + 15);
    backgroundMusic.currentTime = 0;
    backgroundMusic.pause();
    ahh.currentTime = 0;
    ahh.pause();
    endMusic.currentTime = 0;
    endMusic.play();
    highScore = localStorage.getItem("highScore");
    if (!highScore || score > highScore) {
        localStorage.setItem("highScore", score);
        context.fillText("NEW HIGH SCORE!", board.width / 2 - 80, board.height / 2 + 45);
        highScore = score;
    }
    playAgainButton.style.display = "block";
    playAgainButton.style.margin = "0 auto";
    playAgainButton.focus();
}