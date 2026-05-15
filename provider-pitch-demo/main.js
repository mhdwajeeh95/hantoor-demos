"use strict";

const state = {
  questions: [],
  index: 0,
  yesCount: 0,
  rows: 1,
  cols: 1,
  coveredCells: [],
  timerInterval: null,
  elapsed: 0,
};

const els = {
  intro: document.getElementById("intro"),
  btnStart: document.getElementById("btnStart"),
  topbar: document.getElementById("topbar"),
  stage: document.getElementById("stage"),
  grid: document.getElementById("grid"),
  questionText: document.getElementById("questionText"),
  questionCard: document.getElementById("questionCard"),
  btnYes: document.getElementById("btnYes"),
  btnNo: document.getElementById("btnNo"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  sectionLabel: document.getElementById("sectionLabel"),
  finale: document.getElementById("finale"),
  btnRestart: document.getElementById("btnRestart"),
  scorePercent: document.getElementById("scorePercent"),
  scoreTime: document.getElementById("scoreTime"),
  timer: document.getElementById("timer"),
};

async function loadQuestions() {
  const res = await fetch("questions.json");
  const data = await res.json();
  return data.questions || [];
}

function pickGridSize(n) {
  // Auto-fit grid to question count: pick rows x cols closest to square,
  // where rows * cols >= n (extra cells are revealed at finale).
  let best = { rows: 1, cols: n, diff: Infinity, extra: 0 };
  for (let rows = 1; rows <= n; rows++) {
    const cols = Math.ceil(n / rows);
    const total = rows * cols;
    const diff = Math.abs(rows - cols);
    if (total >= n && diff <= best.diff) {
      best = { rows, cols, diff, extra: total - n };
    }
  }
  return { rows: best.rows, cols: best.cols };
}

function buildGrid(rows, cols) {
  els.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  els.grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  els.grid.innerHTML = "";
  const cells = [];
  for (let i = 0; i < rows * cols; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell._row = Math.floor(i / cols);
    cell._col = i % cols;
    els.grid.appendChild(cell);
    cells.push(cell);
  }
  state.coveredCells = cells.slice();
}

function revealRandomCell() {
  if (state.coveredCells.length === 0) return;
  const { rows, cols } = state;
  // Weight each cell by its normalised distance from center (0 = edge, 1 = center).
  // Edge cells get weight 1, center cells get weight ~4, so center reveals ~4x more often.
  const weights = state.coveredCells.map((c) => {
    const dr = 1 - Math.abs(c._row - (rows - 1) / 2) / ((rows - 1) / 2 || 1);
    const dc = 1 - Math.abs(c._col - (cols - 1) / 2) / ((cols - 1) / 2 || 1);
    return 1 + 3 * dr * dc;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let pick = weights.length - 1;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) { pick = i; break; }
  }
  const [cell] = state.coveredCells.splice(pick, 1);
  cell.classList.add("revealed");
}

function revealAllCells() {
  state.coveredCells.forEach((c) => c.classList.add("revealed"));
  state.coveredCells = [];
}

function renderQuestion() {
  const q = state.questions[state.index];
  if (!q) return;
  els.questionText.textContent = q.question;
  els.sectionLabel.textContent = q.section || "";
  els.progressText.textContent = `${state.index} / ${state.questions.length}`;
  const pct = (state.index / state.questions.length) * 100;
  els.progressFill.style.width = `${pct}%`;
}

function finish() {
  stopTimer();
  revealAllCells();
  els.progressText.textContent = `${state.questions.length} / ${state.questions.length}`;
  els.progressFill.style.width = `100%`;
  const pct = Math.round((state.yesCount / state.questions.length) * 100);
  els.scorePercent.textContent = `${pct}%`;
  els.scoreTime.textContent = `خلال ${formatTime(state.elapsed)}`;
  setTimeout(() => {
    els.finale.classList.remove("hidden");
  }, 600);
}

function advance() {
  state.index += 1;
  if (state.index >= state.questions.length) {
    finish();
    return;
  }
  renderQuestion();
}

function onYes() {
  revealRandomCell();
  state.yesCount += 1;
  advance();
}

function onNo() {
  els.questionCard.classList.remove("shake");
  // force reflow so the animation can re-trigger
  void els.questionCard.offsetWidth;
  els.questionCard.classList.add("shake");
  advance();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function startTimer() {
  state.elapsed = 0;
  els.timer.textContent = "0:00";
  state.timerInterval = setInterval(() => {
    state.elapsed += 1;
    els.timer.textContent = formatTime(state.elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function showGame() {
  els.intro.classList.add("hidden");
  els.topbar.classList.remove("hidden");
  els.stage.classList.remove("hidden");
  els.questionCard.classList.remove("hidden");
  startTimer();
}

function reset() {
  stopTimer();
  state.index = 0;
  state.yesCount = 0;
  buildGrid(state.rows, state.cols);
  els.finale.classList.add("hidden");
  renderQuestion();
  startTimer();
}

async function init() {
  state.questions = await loadQuestions();
  if (state.questions.length === 0) {
    els.questionText.textContent = "لا توجد أسئلة.";
    return;
  }
  const { rows, cols } = pickGridSize(state.questions.length);
  state.rows = rows;
  state.cols = cols;
  buildGrid(rows, cols);
  renderQuestion();

  els.btnStart.addEventListener("click", showGame);
  els.btnYes.addEventListener("click", onYes);
  els.btnNo.addEventListener("click", onNo);
  els.btnRestart.addEventListener("click", reset);

  document.addEventListener("keydown", (e) => {
    if (!els.intro.classList.contains("hidden")) return;
    if (els.finale.classList.contains("hidden") === false) return;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "y") onYes();
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "n") onNo();
  });
}

init();
