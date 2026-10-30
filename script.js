// Game configuration and state variables
const GOAL_CANS = 20;        // Total points needed to win
const MILESTONE_CANS = GOAL_CANS / 2;
const GAME_SECONDS = 30;     // Length of the game
const GOLDEN_CAN_POINTS = 3;
const goldenCanSound = new Audio('soundeffects/universfield-video-game-bonus-323603.mp3');
goldenCanSound.preload = 'auto';
const winSound = new Audio('soundeffects/floraphonic-violin-win-5-185128.mp3');
const gameOverSound = new Audio('soundeffects/freesound_community-game-over-arcade-6435.mp3');
const wrongBuzzerSound = new Audio('soundeffects/freesound_community-wrong-buzzer-6268.mp3');
[winSound, gameOverSound, wrongBuzzerSound].forEach(sound => {
  sound.preload = 'auto';
});
const backgroundMusic = [
  new Audio('soundeffects/prettyjohn1-funk-funky-music_32sec-483398.mp3'),
  new Audio('soundeffects/sonican-cooking-background-music-loop-486763.mp3')
];
backgroundMusic.forEach(track => {
  track.preload = 'auto';
  track.addEventListener('ended', playNextMusicTrack);
});
const winningMessages = [
  "Amazing work! You collected enough cans!",
  "Water champion! You reached the goal!",
  "Congratulations! Your water quest is complete!"
];
const losingMessages = [
  "Nice try! You need 20 points to win.",
  "Time is up! Give the quest another go.",
  "So close! Try again and earn 20 points."
];
const milestoneMessages = [
  "Halfway there! 10 points earned!",
  "Incredible! You reached the 10-point milestone!",
  "Great work! You hit the halfway mark!"
];
const penaltyMilestoneMessages = [
  "Careful! That is your third red-can mistake!",
  "Watch out! You have clicked three wrong cans!",
  "Red-can alert! Slow down and check your target!"
];
const HIGH_SCORE_LIMIT = 5;
const HIGH_SCORE_KEY = 'waterQuestHighScores';
let currentCans = 0;         // Current score
let timeLeft = GAME_SECONDS; // Seconds remaining in the game
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;          // Holds the interval for the countdown
let countdownInterval;
let countdownActive = false;
let currentMusicTrack = 0;
let lastCellIndex = -1;     // Prevents consecutive spawns in the same cell
const difficulties = {
  easy: { canTime: 1500, penaltyChance: 0, goldenCanChance: 0.4 },
  medium: { canTime: 1250, penaltyChance: 0.15, goldenCanChance: 0.25 },
  hard: { canTime: 1000, penaltyChance: 0.35, goldenCanChance: 0.12 },
  expert: { canTime: 750, penaltyChance: 1, goldenCanChance: 0.06 }
};
let selectedDifficulty = 'easy';
let milestoneReached = false;
let wrongCanClicks = 0;
let wrongCanMilestoneReached = false;
let pendingHighScore = null;

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = ''; // Clear any existing grid cells
  const countdown = document.createElement('div');
  countdown.id = 'countdown';
  countdown.className = 'countdown';
  countdown.setAttribute('aria-live', 'assertive');
  countdown.setAttribute('aria-hidden', 'true');
  grid.appendChild(countdown);
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }

}

function playNextMusicTrack() {
  if (!countdownActive && !gameActive) return;
  currentMusicTrack = (currentMusicTrack + 1) % backgroundMusic.length;
  backgroundMusic[currentMusicTrack].currentTime = 0;
  backgroundMusic[currentMusicTrack].play().catch(error => {
    console.warn('Unable to play background music.', error);
  });
}

function startBackgroundMusic() {
  backgroundMusic.forEach(track => {
    track.pause();
    track.currentTime = 0;
    track.loop = false;
  });
  backgroundMusic[currentMusicTrack].play().catch(error => {
    console.warn('Unable to play background music.', error);
  });
}

function stopBackgroundMusic() {
  backgroundMusic.forEach(track => {
    track.pause();
    track.currentTime = 0;
  });
}

// Ensure the grid is created when the page loads
createGrid();

function getHighScores() {
  try {
    const storedScores = JSON.parse(localStorage.getItem(HIGH_SCORE_KEY) || '[]');
    return Array.isArray(storedScores)
      ? storedScores
        .filter(entry => entry && typeof entry.initials === 'string' && Number.isFinite(entry.score))
        .sort((first, second) => second.score - first.score)
        .slice(0, HIGH_SCORE_LIMIT)
      : [];
  } catch (error) {
    return [];
  }
}

function saveHighScores(scores) {
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores.slice(0, HIGH_SCORE_LIMIT)));
}

function renderHighScores() {
  const scoreList = document.getElementById('high-scores');
  const highScores = getHighScores();
  scoreList.innerHTML = '';

  if (highScores.length === 0) {
    scoreList.innerHTML = '<tr><td colspan="3" class="empty-score">No scores yet</td></tr>';
    return;
  }

  highScores.forEach((entry, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.initials}</td>
      <td>${entry.score}</td>
    `;
    scoreList.appendChild(row);
  });
}

function qualifiesForHighScore(score) {
  if (score <= 0) return false;
  const highScores = getHighScores();
  return highScores.length < HIGH_SCORE_LIMIT || score > highScores[highScores.length - 1].score;
}

function showHighScoreEntry(score) {
  pendingHighScore = score;
  const form = document.getElementById('initials-form');
  const input = document.getElementById('initials');
  form.hidden = false;
  input.value = '';
  input.focus();
}

function savePendingHighScore(event) {
  event.preventDefault();
  const input = document.getElementById('initials');
  const initials = input.value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(initials) || pendingHighScore === null) {
    input.setCustomValidity('Enter exactly three letters.');
    input.reportValidity();
    return;
  }

  input.setCustomValidity('');
  const highScores = getHighScores();
  highScores.push({ initials, score: pendingHighScore });
  highScores.sort((first, second) => second.score - first.score);
  saveHighScores(highScores);
  renderHighScores();
  document.getElementById('initials-form').hidden = true;
  document.getElementById('achievement-message').textContent = `${initials} entered the leaderboard with ${pendingHighScore} points!`;
  pendingHighScore = null;
}

function resetHighScores() {
  localStorage.removeItem(HIGH_SCORE_KEY);
  renderHighScores();
}

// Shows a normal can and, depending on the difficulty, a red penalty can.
function spawnWaterCan() {
  if (!gameActive) return;

  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => (cell.innerHTML = ''));

  let normalIndex;
  do {
    normalIndex = Math.floor(Math.random() * cells.length);
  } while (cells.length > 1 && normalIndex === lastCellIndex);
  lastCellIndex = normalIndex;

  const isGoldenCan = Math.random() < difficulties[selectedDifficulty].goldenCanChance;
  cells[normalIndex].innerHTML = `
    <div class="water-can-wrapper${isGoldenCan ? ' golden-can-wrapper' : ''}"${isGoldenCan ? ' data-golden="true"' : ''}>
      <img class="water-can${isGoldenCan ? ' golden-can' : ''}" src="img/water-can.png" alt="${isGoldenCan ? 'Golden bonus water can' : 'Water can'}">
    </div>
  `;

  if (Math.random() < difficulties[selectedDifficulty].penaltyChance && cells.length > 1) {
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
  if (gameActive || countdownActive || pendingHighScore !== null) return; // Prevent overlapping games
  countdownActive = true;
  currentMusicTrack = (currentMusicTrack + 1) % backgroundMusic.length;
  startBackgroundMusic();
  const countdown = document.getElementById('countdown');
  let secondsRemaining = 3;
  countdown.textContent = secondsRemaining;
  countdown.classList.add('visible');
  countdown.setAttribute('aria-hidden', 'false');
  document.getElementById('start-game').textContent = 'Get Ready...';
  document.getElementById('difficulty').disabled = true;
  countdownInterval = setInterval(() => {
    secondsRemaining -= 1;
    if (secondsRemaining === 0) {
      clearInterval(countdownInterval);
      countdownActive = false;
      countdown.classList.remove('visible');
      countdown.setAttribute('aria-hidden', 'true');
      beginGame();
      return;
    }
    countdown.textContent = secondsRemaining;
    countdown.classList.remove('visible');
    void countdown.offsetWidth;
    countdown.classList.add('visible');
  }, 1000);
}

function beginGame() {
  gameActive = true;
  currentCans = 0;
  timeLeft = GAME_SECONDS;
  milestoneReached = false;
  wrongCanClicks = 0;
  wrongCanMilestoneReached = false;
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = timeLeft;
  document.getElementById('achievement-message').textContent = 'Find the water cans!';
  document.getElementById('achievements').className = 'message-panel playing';
  document.getElementById('start-game').textContent = 'Game Running';
  document.getElementById('difficulty').disabled = true;

  createGrid(); // Set up the game grid
  lastCellIndex = -1;
  spawnWaterCan();
  spawnInterval = setInterval(spawnWaterCan, difficulties[selectedDifficulty].canTime);
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
  const goldenCanClicked = wrapper.dataset.golden === 'true';
  currentCans = Math.max(0, currentCans + (penaltyClicked ? -1 : goldenCanClicked ? GOLDEN_CAN_POINTS : 1));
  document.getElementById('current-cans').textContent = currentCans;
  wrapper.remove();

  if (goldenCanClicked) {
    goldenCanSound.currentTime = 0;
    goldenCanSound.play().catch(error => {
      console.warn('Unable to play the golden can sound effect.', error);
    });
  }

  if (penaltyClicked) {
    playSound(wrongBuzzerSound);
    wrongCanClicks += 1;
    startPenaltyFlash();

    if (wrongCanClicks >= 3 && !wrongCanMilestoneReached) {
      wrongCanMilestoneReached = true;
      const penaltyMessage = penaltyMilestoneMessages[Math.floor(Math.random() * penaltyMilestoneMessages.length)];
      document.getElementById('achievements').className = 'message-panel penalty-milestone';
      document.getElementById('achievement-message').textContent = penaltyMessage;
    }
  }

  if (!penaltyClicked && currentCans >= MILESTONE_CANS && !milestoneReached) {
    milestoneReached = true;
    const milestoneMessage = milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)];
    document.getElementById('achievements').className = 'message-panel milestone';
    document.getElementById('achievement-message').textContent = milestoneMessage;
    startCelebration();
  }

}

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(error => {
    console.warn('Unable to play game sound effect.', error);
  });
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
  stopBackgroundMusic();

  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => (cell.innerHTML = ''));

  const messages = currentCans >= GOAL_CANS ? winningMessages : losingMessages;
  playSound(currentCans >= GOAL_CANS ? winSound : gameOverSound);
  const message = messages[Math.floor(Math.random() * messages.length)];
  const achievements = document.getElementById('achievements');
  achievements.className = currentCans >= GOAL_CANS
    ? 'message-panel win'
    : 'message-panel lose';
  document.getElementById('achievement-message').textContent = message;
  document.getElementById('start-game').textContent = 'Play Again';

  if (qualifiesForHighScore(currentCans)) {
    showHighScoreEntry(currentCans);
  }

  if (currentCans >= GOAL_CANS) {
    startCelebration();
  } else {
    startLossRain();
  }
}

function resetGame() {
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  gameActive = false;
  countdownActive = false;
  stopBackgroundMusic();
  currentCans = 0;
  timeLeft = GAME_SECONDS;
  lastCellIndex = -1;
  milestoneReached = false;
  wrongCanClicks = 0;
  wrongCanMilestoneReached = false;
  pendingHighScore = null;

  document.getElementById('current-cans').textContent = '0';
  document.getElementById('timer').textContent = GAME_SECONDS;
  document.getElementById('achievement-message').textContent = 'Press Start Game to begin!';
  document.getElementById('achievements').className = 'message-panel';
  document.getElementById('start-game').textContent = 'Start Game';
  document.getElementById('difficulty').disabled = false;
  document.getElementById('initials-form').hidden = true;
  document.getElementById('initials').setCustomValidity('');

  const celebration = document.getElementById('celebration');
  celebration.className = '';
  celebration.innerHTML = '';
  document.getElementById('penalty-flash').classList.remove('active');
  const countdown = document.getElementById('countdown');
  countdown.classList.remove('visible');
  countdown.setAttribute('aria-hidden', 'true');

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
document.getElementById('reset-scores').addEventListener('click', resetHighScores);
document.getElementById('initials-form').addEventListener('submit', savePendingHighScore);
document.getElementById('difficulty').addEventListener('change', event => {
  selectedDifficulty = event.target.value;
});

renderHighScores();
