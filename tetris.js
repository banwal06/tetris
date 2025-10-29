(() => {
  "use strict";

  // Config
  const COLS = 10;
  const ROWS = 20;
  const COLORS = {
    0: "#000000",
    I: "#67e8f9",
    O: "#fde047",
    T: "#a78bfa",
    S: "#34d399",
    Z: "#f87171",
    J: "#60a5fa",
    L: "#fb923c",
    G: "#1f2937", // grid background
  };

  // DOM
  const canvas = document.getElementById("tetris");
  const scoreEl = document.getElementById("t-score");
  const linesEl = document.getElementById("t-lines");
  const levelEl = document.getElementById("t-level");
  const btnStart = document.getElementById("t-start");
  const btnReset = document.getElementById("t-reset");

  const ctx = canvas.getContext("2d");

  // Handle device pixel ratio for crisp drawing
  function setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width;
    const cssH = canvas.height;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setupHiDPI();

  const CELL = Math.floor(canvas.clientWidth / COLS); // 240 / 10 = 24

  // Shapes (Tetromino matrices)
  const SHAPES = {
    I: [
      [[1,1,1,1]],
      [[1],[1],[1],[1]],
    ],
    O: [
      [[1,1],[1,1]],
    ],
    T: [
      [[1,1,1],[0,1,0]],
      [[0,1],[1,1],[0,1]],
      [[0,1,0],[1,1,1]],
      [[1,0],[1,1],[1,0]],
    ],
    S: [
      [[0,1,1],[1,1,0]],
      [[1,0],[1,1],[0,1]],
    ],
    Z: [
      [[1,1,0],[0,1,1]],
      [[0,1],[1,1],[1,0]],
    ],
    J: [
      [[1,0,0],[1,1,1]],
      [[1,1],[1,0],[1,0]],
      [[1,1,1],[0,0,1]],
      [[0,1],[0,1],[1,1]],
    ],
    L: [
      [[0,0,1],[1,1,1]],
      [[1,0],[1,0],[1,1]],
      [[1,1,1],[1,0,0]],
      [[1,1],[0,1],[0,1]],
    ],
  };

  // 7-bag randomizer
  class Bag {
    constructor() {
      this.bag = [];
    }
    next() {
      if (this.bag.length === 0) {
        this.bag = ["I","O","T","S","Z","J","L"].sort(() => Math.random() - 0.5);
      }
      return this.bag.pop();
    }
  }

  // Game State
  let board = createBoard(ROWS, COLS);
  const bag = new Bag();

  let current = null;    // { type, rot, x, y, shape }
  let dropInterval = 1000; // ms
  let lastTime = 0;
  let acc = 0;
  let running = false;
  let gameOver = false;

  let score = 0;
  let lines = 0;
  let level = 1;

  function createBoard(r, c) {
    return Array.from({ length: r }, () => Array(c).fill(0));
  }

  function spawn() {
    const type = bag.next();
    current = {
      type,
      rot: 0,
      x: Math.floor(COLS / 2) - 2,
      y: 0,
      shape: SHAPES[type][0],
    };
    if (collide(board, current)) {
      running = false;
      gameOver = true;
    }
  }

  function rotatePiece(p, dir = 1) {
    const list = SHAPES[p.type];
    const nextRot = (p.rot + dir + list.length) % list.length;
    const nextShape = list[nextRot];
    const test = { ...p, rot: nextRot, shape: nextShape };

    // Simple wall-kick attempts
    const kicks = [0, -1, 1, -2, 2];
    for (const dx of kicks) {
      test.x = p.x + dx;
      if (!collide(board, test)) {
        p.rot = test.rot;
        p.shape = test.shape;
        p.x = test.x;
        return;
      }
    }
  }

  function collide(bd, p) {
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[0].length; x++) {
        if (!p.shape[y][x]) continue;
        const nx = p.x + x;
        const ny = p.y + y;
        if (ny < 0) continue;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (bd[ny][nx]) return true;
      }
    }
    return false;
  }

  function merge(bd, p) {
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[0].length; x++) {
        if (p.shape[y][x]) {
          const ny = p.y + y;
          const nx = p.x + x;
          if (ny >= 0) bd[ny][nx] = p.type;
        }
      }
    }
  }

  function clearLines() {
    let removed = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((c) => c)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
        removed++;
        y++; // re-check same row index after splice
      }
    }
    if (removed > 0) {
      // Basic scoring (Tetris guideline variant)
      const scores = { 1: 40, 2: 100, 3: 300, 4: 1200 };
      score += (scores[removed] || 0) * level;
      lines += removed;
      level = 1 + Math.floor(lines / 10);
      // Speed up
      dropInterval = Math.max(120, 1000 - (level - 1) * 80);
      updateHUD();
    }
  }

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (linesEl) linesEl.textContent = String(lines);
    if (levelEl) levelEl.textContent = String(level);
  }

  // Movement
  function move(dx) {
    if (!current) return;
    current.x += dx;
    if (collide(board, current)) current.x -= dx;
  }

  function softDrop() {
    if (!current) return;
    current.y++;
    if (collide(board, current)) {
      current.y--;
      lockPiece();
    }
  }

  function hardDrop() {
    if (!current) return;
    while (!collide(board, current)) current.y++;
    current.y--;
    lockPiece();
  }

  function lockPiece() {
    merge(board, current);
    clearLines();
    spawn();
  }

  // Draw
  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    ctx.strokeStyle = "#1f2937";
    ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
  }

  function draw() {
    // Background
    ctx.fillStyle = COLORS.G;
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Board
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = board[y][x];
        if (t) drawCell(x, y, COLORS[t]);
      }
    }
    // Current piece
    if (current) {
      for (let y = 0; y < current.shape.length; y++) {
        for (let x = 0; x < current.shape[0].length; x++) {
          if (current.shape[y][x]) {
            const nx = current.x + x;
            const ny = current.y + y;
            if (ny >= 0) drawCell(nx, ny, COLORS[current.type]);
          }
        }
      }
    }
  }

  // Loop
  function update(dt) {
    if (!running || gameOver) return;
    acc += dt;
    if (acc >= dropInterval) {
      acc = 0;
      softDrop();
    }
  }

  function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Controls
  function onKey(e) {
    if (!running || gameOver) return;
    switch (e.code) {
      case "ArrowLeft": e.preventDefault(); move(-1); break;
      case "ArrowRight": e.preventDefault(); move(1); break;
      case "ArrowDown": e.preventDefault(); softDrop(); break;
      case "ArrowUp": e.preventDefault(); rotatePiece(current, 1); break;
      case "Space": e.preventDefault(); hardDrop(); break;
    }
  }

  function startPause() {
    if (gameOver) return;
    running = !running;
    if (running && !current) {
      spawn();
      updateHUD();
    }
  }

  function resetGame() {
    board = createBoard(ROWS, COLS);
    current = null;
    running = false;
    gameOver = false;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    acc = 0;
    updateHUD();
    draw();
  }

  // Events
  window.addEventListener("keydown", onKey);
  if (btnStart) btnStart.addEventListener("click", startPause);
  if (btnReset) btnReset.addEventListener("click", resetGame);

  // Boot
  resetGame();
  requestAnimationFrame((t) => {
    lastTime = t;
    requestAnimationFrame(loop);
  });
})();
