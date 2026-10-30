// Game configuration and state variables
const GOAL_CANS = 20;        // Total items needed to collect
const GAME_SECONDS = 30;     // Length of the game
const winningMessages = [
  "Amazing work! You collected enough cans!",
  "Water champion! You reached the goal!",
  "Congratulations! Your water quest is complete!"
];
const losingMessages = [
  "Nice try! You need 20 cans to win.",
  "Time is up! Give the quest another go.",
  "So close! Try again and collect 20 cans."
];
let currentCans = 0;         // Current number of items collected
let timeLeft = GAME_SECONDS; // Seconds remaining in the game
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;          // Holds the interval for the countdown
let lastCellIndex = -1;     // Prevents consecutive spawns in the same cell
const PENALTY_CHANCE = 0.25;

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

// Shows a normal can and, randomly, a red penalty can for the same one-second period.
function spawnWaterCan() {
  if (!gameActive) return;

  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => (cell.innerHTML = ''));

  let normalIndex;
  do {
    normalIndex = Math.floor(Math.random() * cells.length);
  } while (cells.length > 1 && normalIndex === lastCellIndex);
  lastCellIndex = normalIndex;

  cells[normalIndex].innerHTML = `
    <div class="water-can-wrapper">
      <img class="water-can" src="img/water-can.png" alt="Water can">
    </div>
  `;

  if (Math.random() < PENALTY_CHANCE && cells.length > 1) {
    let penaltyIndex;
    do {
      penaltyIndex = Math.floor(Math.random() * cells.length);
    } while (penaltyIndex === normalIndex);

    cells[penaltyIndex].innerHTML = `
      <div class="water-can-wrapper penalty-can-wrapper">
        <img class="water-can penalty-can" src="img/water-can.png" alt="Red penalty can">
      </div>
    `;
  }
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  currentCans = 0;
  timeLeft = GAME_SECONDS;
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = timeLeft;
  document.getElementById('achievement-message').textContent = 'Find the water cans!';
  document.getElementById('achievements').className = 'message-panel playing';
  document.getElementById('start-game').textContent = 'Game Running';

  createGrid(); // Set up the game grid
  lastCellIndex = -1;
  spawnWaterCan();
  spawnInterval = setInterval(spawnWaterCan, 1000);
  timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timeLeft -= 1;
  document.getElementById('timer').textContent = timeLeft;

  if (timeLeft <= 0) {
    endGame();
  }
}

function collectCan(wrapper) {
  if (!gameActive || !wrapper || wrapper.dataset.collected === 'true') return;
  wrapper.dataset.collected = 'true';
  const penaltyClicked = wrapper.classList.contains('penalty-can-wrapper');
  currentCans += penaltyClicked ? -1 : 1;
  document.getElementById('current-cans').textContent = currentCans;
  wrapper.remove();

  if (penaltyClicked) {
    startPenaltyFlash();
  }

}

function startPenaltyFlash() {
  const flash = document.getElementById('penalty-flash');
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
  window.setTimeout(() => flash.classList.remove('active'), 300);
}

function startCelebration() {
  const celebration = document.getElementById('celebration');
  celebration.className = '';
  celebration.innerHTML = '';

  for (let i = 0; i < 40; i++) {
    const drop = document.createElement('span');
    drop.className = 'celebration-drop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 0.8}s`;
    drop.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
    celebration.appendChild(drop);
  }

  celebration.classList.add('active');
  window.setTimeout(() => {
    celebration.classList.remove('active');
    celebration.innerHTML = '';
  }, 3000);
}

function startLossRain() {
  const celebration = document.getElementById('celebration');
  celebration.className = '';
  celebration.innerHTML = '';

  for (let i = 0; i < 70; i++) {
    const drop = document.createElement('span');
    drop.className = 'rain-drop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 1.2}s`;
    drop.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
    celebration.appendChild(drop);
  }

  celebration.classList.add('active', 'loss-rain');
  window.setTimeout(() => {
    celebration.className = '';
    celebration.innerHTML = '';
  }, 4000);
}

function endGame() {
  if (!gameActive) return;
  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop the countdown

  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => (cell.innerHTML = ''));

  const messages = currentCans >= GOAL_CANS ? winningMessages : losingMessages;
  const message = messages[Math.floor(Math.random() * messages.length)];
  const achievements = document.getElementById('achievements');
  achievements.className = currentCans >= GOAL_CANS
    ? 'message-panel win'
    : 'message-panel lose';
  document.getElementById('achievement-message').textContent = message;
  document.getElementById('start-game').textContent = 'Play Again';

  if (currentCans >= GOAL_CANS) {
    startCelebration();
  } else {
    startLossRain();
  }
}

function resetGame() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  gameActive = false;
  currentCans = 0;
  timeLeft = GAME_SECONDS;
  lastCellIndex = -1;

  document.getElementById('current-cans').textContent = '0';
  document.getElementById('timer').textContent = GAME_SECONDS;
  document.getElementById('achievement-message').textContent = 'Press Start Game to begin!';
  document.getElementById('achievements').className = 'message-panel';
  document.getElementById('start-game').textContent = 'Start Game';

  const celebration = document.getElementById('celebration');
  celebration.className = '';
  celebration.innerHTML = '';
  document.getElementById('penalty-flash').classList.remove('active');

  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => (cell.innerHTML = ''));
}

// Count a can only when the active can is clicked.
document.querySelector('.game-grid').addEventListener('click', event => {
  const wrapper = event.target.closest('.water-can-wrapper');
  if (wrapper) {
    collectCan(wrapper);
  }
});

// Start or restart the game from the main button.
document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('reset-game').addEventListener('click', resetGame);
