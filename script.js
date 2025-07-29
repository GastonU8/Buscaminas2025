const DIFFICULTY = {
  EASY: { rows: 9, cols: 9, mines: 10, label: 'Fácil' },
  MEDIUM: { rows: 16, cols: 16, mines: 40, label: 'Medio' },
  HARD: { rows: 16, cols: 30, mines: 99, label: 'Difícil' },
};

let difficulty = DIFFICULTY.EASY;
let grid = [];
let firstClick = true;
let flagCount = 0;
let gameStatus = 'waiting';
let isMuted = false;
let paused = false;
let userName = '';
let timerInterval;
let elapsedSeconds = 0;

// DOM
const gridElement = document.getElementById('grid');
const mineCounter = document.getElementById('mine-counter');
const resetButton = document.getElementById('reset-button');
const retryButton = document.getElementById('retry-button');
const statusMessage = document.getElementById('status-message');
const soundBomb = document.getElementById('sound-bomb');
const soundWin = document.getElementById('sound-win');
const backgroundSound = document.getElementById('background-sound');
const animationContainer = document.getElementById('animation-container');
const muteButton = document.getElementById('mute-button');
const pauseButton = document.getElementById('pause-button');
const timerElement = document.getElementById('timer');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start-button');
const usernameInput = document.getElementById('username-input');
const rankingList = document.getElementById('ranking-list');
const themeToggle = document.getElementById('dark-mode-button');
const difficultyButtons = document.querySelectorAll('#difficulty-buttons button');
const rankingDifficultyLabel = document.getElementById('ranking-difficulty-label');

// Timer
function startTimer() {
  timerInterval = setInterval(() => {
    if (!paused) {
      elapsedSeconds++;
      timerElement.textContent = formatTime(elapsedSeconds);
    }
  }, 1000);
}
function stopTimer() {
  clearInterval(timerInterval);
}
function resetTimer() {
  stopTimer();
  elapsedSeconds = 0;
  timerElement.textContent = "00:00";
}
function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

// Tablero
function createGrid() {
  grid = [];
  for (let r = 0; r < difficulty.rows; r++) {
    const row = [];
    for (let c = 0; c < difficulty.cols; c++) {
      row.push({ revealed: false, isMine: false, flagged: false, adjacentMines: 0 });
    }
    grid.push(row);
  }
  renderGrid();
  updateMineCounter();
  resetTimer();
  createBackgroundAnimation();
  gameStatus = 'playing';
  updateRankingLabel();
  loadRanking();
}

function renderGrid() {
  gridElement.innerHTML = '';
  gridElement.style.gridTemplateColumns = `repeat(${difficulty.cols}, 28px)`;
  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;

      if (cell.revealed) {
        div.classList.add('revealed');
        if (cell.isMine) {
          div.textContent = '💣';
          div.classList.add('mine');
        } else if (cell.adjacentMines > 0) {
          div.textContent = cell.adjacentMines;
          div.classList.add(`text-${cell.adjacentMines}`);
        }
      } else if (cell.flagged) {
        div.textContent = '🚩';
      }

      div.addEventListener('click', handleCellClick);
      div.addEventListener('contextmenu', handleRightClick);
      gridElement.appendChild(div);
    });
  });
}

function updateMineCounter() {
  mineCounter.textContent = `💣 ${difficulty.mines - flagCount}`;
}

// Eventos
function handleCellClick(e) {
  if (paused) return;
  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  if (gameStatus !== 'playing' || grid[row][col].flagged) return;

  if (firstClick) {
    placeMines(row, col);
    firstClick = false;
    startTimer();
    startBackgroundSound();
  }

  if (grid[row][col].isMine) return endGame(false);
  revealCell(row, col);
  renderGrid();
  if (checkWin()) endGame(true);
}

function handleRightClick(e) {
  e.preventDefault();
  if (paused) return;
  const row = +e.target.dataset.row;
  const col = +e.target.dataset.col;
  if (grid[row][col].revealed) return;

  const cell = grid[row][col];
  cell.flagged = !cell.flagged;
  flagCount += cell.flagged ? 1 : -1;
  updateMineCounter();
  renderGrid();
}

// Minas
function placeMines(skipRow, skipCol) {
  let placed = 0;
  while (placed < difficulty.mines) {
    const r = Math.floor(Math.random() * difficulty.rows);
    const c = Math.floor(Math.random() * difficulty.cols);
    if ((r !== skipRow || c !== skipCol) && !grid[r][c].isMine) {
      grid[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < difficulty.rows; r++) {
    for (let c = 0; c < difficulty.cols; c++) {
      if (!grid[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (grid[nr]?.[nc]?.isMine) count++;
          }
        }
        grid[r][c].adjacentMines = count;
      }
    }
  }
}

function revealCell(r, c) {
  const cell = grid[r]?.[c];
  if (!cell || cell.revealed || cell.flagged) return;
  cell.revealed = true;
  if (cell.adjacentMines === 0) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        revealCell(r + dr, c + dc);
      }
    }
  }
}

function checkWin() {
  return grid.flat().filter(c => !c.revealed).length === difficulty.mines;
}

function endGame(won) {
  gameStatus = won ? 'won' : 'lost';
  stopTimer();
  stopBackgroundSound();
  resetButton.textContent = won ? '😎' : '😵';
  statusMessage.textContent = won ? `¡Ganaste, ${userName}!` : '¡Perdiste!';
  showRetryButton(true);
  if (!won) revealAllMines();
  renderGrid();
  showAnimation(won ? 'win' : 'bomb');
  playSound(won ? 'win' : 'bomb');
  if (won && userName) saveRanking(userName, elapsedSeconds, difficulty.label);
}

function revealAllMines() {
  grid.flat().forEach(cell => {
    if (cell.isMine) cell.revealed = true;
  });
}

function resetGame() {
  firstClick = true;
  flagCount = 0;
  gameStatus = 'playing';
  statusMessage.textContent = `¡Buena suerte, ${userName}!`;
  resetButton.textContent = '😊';
  animationContainer.innerHTML = '';
  stopBackgroundSound();
  resetTimer();
  showRetryButton(false);
  createGrid();
}

// Animación y Sonido
function createBackgroundAnimation() {
  animationContainer.innerHTML = '';
  const img = document.createElement('img');
  img.src = 'media/ayuda_pensar.gif';
  img.className = 'background-animation';
  animationContainer.appendChild(img);
}
function showAnimation(type) {
  const img = document.createElement('img');
  img.className = 'main-animation';
  img.src = type === 'win' ? 'media/homer_woohoo.gif' : 'media/risa_nelson.gif';
  animationContainer.appendChild(img);
  setTimeout(() => img.remove(), 3000);
}
function playSound(type) {
  if (isMuted) return;
  const sound = type === 'win' ? soundWin : soundBomb;
  sound.currentTime = 0;
  sound.play();
  if (type === 'bomb') {
    setTimeout(() => {
      sound.pause();
      sound.currentTime = 0;
    }, 2000);
  }
}
function startBackgroundSound() {
  if (isMuted) return;
  backgroundSound.volume = 0.4;
  backgroundSound.play().catch(console.warn);
}
function stopBackgroundSound() {
  backgroundSound.pause();
  backgroundSound.currentTime = 0;
}

// Botones
muteButton.addEventListener('click', () => {
  isMuted = !isMuted;
  muteButton.textContent = isMuted ? '🔇' : '🔊';
  backgroundSound.muted = isMuted;
});
pauseButton.addEventListener('click', () => {
  paused = !paused;
  pauseButton.textContent = paused ? '▶️' : '⏸️';
});
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
}
resetButton.addEventListener('click', resetGame);
retryButton.addEventListener('click', resetGame);
difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = DIFFICULTY[btn.dataset.difficulty];
    difficultyButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resetGame();
  });
});

// Ranking
function saveRanking(name, time, diffLabel) {
  const allRankings = JSON.parse(localStorage.getItem('buscaminasRankings') || '{}');
  if (!allRankings[diffLabel]) allRankings[diffLabel] = [];
  allRankings[diffLabel].push({ name, time });
  allRankings[diffLabel].sort((a, b) => a.time - b.time);
  allRankings[diffLabel] = allRankings[diffLabel].slice(0, 10);
  localStorage.setItem('buscaminasRankings', JSON.stringify(allRankings));
  loadRanking();
}
function loadRanking() {
  const allRankings = JSON.parse(localStorage.getItem('buscaminasRankings') || '{}');
  const currentRanking = allRankings[difficulty.label] || [];

  rankingList.innerHTML = '';
  if (currentRanking.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Aún no hay jugadores en el ranking.';
    rankingList.appendChild(li);
  } else {
    currentRanking.forEach(entry => {
      const li = document.createElement('li');
      li.textContent = `${entry.name}: ${formatTime(entry.time)}`;
      rankingList.appendChild(li);
    });
  }
}
function updateRankingLabel() {
  rankingDifficultyLabel.textContent = difficulty.label;
}
function showRetryButton(show) {
  retryButton.style.display = show ? 'block' : 'none';
}

// Inicio
startButton.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (!name) return alert('Por favor, ingresa tu nombre.');
  userName = name;
  overlay.classList.remove('active');
  document.getElementById('game-container').classList.remove('hidden');
  statusMessage.textContent = `¡Buena suerte, ${userName}!`;
  createGrid();

});

// Validación del formulario de contacto
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const email = document.getElementById("email").value.trim();
    const mensaje = document.getElementById("mensaje").value.trim();

    const nombreValido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,}$/.test(nombre);
    const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    const mensajeValido = mensaje.length > 5;

    if (!nombreValido) {
      alert("El nombre debe tener al menos 3 letras y solo caracteres válidos.");
      return;
    }

    if (!emailValido) {
      alert("El correo electrónico no es válido.");
      return;
    }

    if (!mensajeValido) {
      alert("El mensaje debe contener más de 5 caracteres.");
      return;
    }

    // Abrir herramienta de envío de emails predeterminada
    const mailtoLink = `mailto:ejemplo@correo.com?subject=Mensaje de ${encodeURIComponent(nombre)}&body=${encodeURIComponent(mensaje)}%0A%0ACorreo: ${email}`;
    window.location.href = mailtoLink;
  });
}
