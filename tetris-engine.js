// tetris-engine.js
// 싱글 테트리스 엔진 (UI/파이어베이스와 완전히 분리)

/* ===== 기본 상수 & 데이터 ===== */
export const T_COLS = 10;
export const T_ROWS = 20;

// 각 테트로미노 회전 상태 (x, y)
export const T_SHAPES = {
  I: [
    [[0, 1],[1, 1],[2, 1],[3, 1]],
    [[2, 0],[2, 1],[2, 2],[2, 3]],
    [[0, 2],[1, 2],[2, 2],[3, 2]],
    [[1, 0],[1, 1],[1, 2],[1, 3]],
  ],
  O: [
    [[1, 0],[2, 0],[1, 1],[2, 1]],
    [[1, 0],[2, 0],[1, 1],[2, 1]],
    [[1, 0],[2, 0],[1, 1],[2, 1]],
    [[1, 0],[2, 0],[1, 1],[2, 1]],
  ],
  T: [
    [[1, 0],[0, 1],[1, 1],[2, 1]],
    [[1, 0],[1, 1],[2, 1],[1, 2]],
    [[0, 1],[1, 1],[2, 1],[1, 2]],
    [[1, 0],[0, 1],[1, 1],[1, 2]],
  ],
  S: [
    [[1, 0],[2, 0],[0, 1],[1, 1]],
    [[1, 0],[1, 1],[2, 1],[2, 2]],
    [[1, 1],[2, 1],[0, 2],[1, 2]],
    [[0, 0],[0, 1],[1, 1],[1, 2]],
  ],
  Z: [
    [[0, 0],[1, 0],[1, 1],[2, 1]],
    [[2, 0],[1, 1],[2, 1],[1, 2]],
    [[0, 1],[1, 1],[1, 2],[2, 2]],
    [[1, 0],[0, 1],[1, 1],[0, 2]],
  ],
  J: [
    [[0, 0],[0, 1],[1, 1],[2, 1]],
    [[1, 0],[2, 0],[1, 1],[1, 2]],
    [[0, 1],[1, 1],[2, 1],[2, 2]],
    [[1, 0],[1, 1],[0, 2],[1, 2]],
  ],
  L: [
    [[2, 0],[0, 1],[1, 1],[2, 1]],
    [[1, 0],[1, 1],[1, 2],[2, 2]],
    [[0, 1],[1, 1],[2, 1],[0, 2]],
    [[0, 0],[1, 0],[1, 1],[1, 2]],
  ],
};

export const T_COLORS = {
  I: "#4de0ff",
  O: "#ffe94d",
  T: "#d77bff",
  S: "#4dff88",
  Z: "#ff4d6b",
  J: "#4d7dff",
  L: "#ffa54d",
};

export function createEmptyBoard() {
  const rows = [];
  for (let y = 0; y < T_ROWS; y++) {
    const row = new Array(T_COLS).fill(null);
    rows.push(row);
  }
  return rows;
}

export function getShapeCells(type, rot) {
  const shapes = T_SHAPES[type];
  if (!shapes) return [];
  const r = ((rot % 4) + 4) % 4;
  return shapes[r];
}

/* 공통 셀 DIV 생성 (px 기반) */
function createCellDivPx(left, top, size, color) {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${size}px`;
  div.style.height = `${size}px`;
  div.style.boxSizing = "border-box";
  div.style.background = color || "#fff";
  div.style.border = "1px solid rgba(0,0,0,0.4)";
  div.style.borderRadius = "2px";
  return div;
}

/* 퍼센트 기반 필드 셀 */
function createCellDivPercent(left, top, w, h, color) {
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.left = left;
  div.style.top = top;
  div.style.width = w;
  div.style.height = h;
  div.style.boxSizing = "border-box";
  div.style.background = color || "#fff";
  div.style.border = "1px solid rgba(0,0,0,0.4)";
  div.style.borderRadius = "2px";
  return div;
}

function isBoardEmpty(board) {
  for (let y = 0; y < T_ROWS; y++) {
    for (let x = 0; x < T_COLS; x++) {
      if (board[y][x]) return false;
    }
  }
  return true;
}

/**
 * 싱글 테트리스 게임을 fieldEl에 붙인다.
 *
 * @param {HTMLElement} fieldEl  블럭을 그릴 .field 요소
 * @param {object} tetrisInput   입력 소스 (window.tetrisInput 같은 객체: .on(action, cb))
 * @param {object} options       {
 *    dropInterval,  // 레벨 1 기준 중력(ms)
 *    onGameOver,
 *    onScoreChange(score, detail),
 *    onLinesChange(totalLines),
 *    onLevelChange(level)
 * }
 * @returns {function} cleanup 함수
 */
export function createSingleGame(fieldEl, tetrisInput, options = {}) {
  if (!fieldEl) return () => {};

  const holdEl = document.getElementById("hold-view");
  const nextEl = document.getElementById("next-view");

  const board = createEmptyBoard();
  const baseDropInterval = options.dropInterval ?? 900; // 레벨1 기본 중력

  const onGameOver =
    typeof options.onGameOver === "function" ? options.onGameOver : null;
  const onScoreChange =
    typeof options.onScoreChange === "function" ? options.onScoreChange : null;
  const onLinesChange =
    typeof options.onLinesChange === "function" ? options.onLinesChange : null;
  const onLevelChange =
    typeof options.onLevelChange === "function" ? options.onLevelChange : null;

  // ===== 게임 상태 =====
  let current = null;        // { type, x, y, rot }
  let nextBag = [];          // 7-bag
  let nextQueue = [];        // 앞으로 나올 순서 (최소 7개 유지)
  let holdType = null;
  let canHold = true;

  let rafId = null;
  let ended = false;

  // 점수/레벨/콤보/백투백/통계
  let score = 0;
  let totalLines = 0;
  let level = 1;          // lines 기준으로 자동 계산
  let combo = -1;         // -1: 콤보 없음, 0 이상: 콤보 n번째
  let backToBack = false; // 직전 클리어가 Tetris/T-Spin 이었는지

  // T-Spin 판정용
  let lastActionWasRotate = false;

  // 중력/락 딜레이 타이머
  let lastTickTime = 0;
  let fallElapsed = 0;          // 자동 낙하용 누적시간
  let lockElapsed = 0;          // 바닥 닿은 상태에서의 누적시간
  const LOCK_DELAY = 2000;      // ms, 바닥에서 2초 후 확정

  function resetGravityAndLockTimer() {
    fallElapsed = 0;
    lockElapsed = 0;
  }

  // 현재 레벨에 따른 중력 간격(ms)
  function getCurrentDropInterval() {
    const l = Math.max(1, level);
    // 레벨 올릴 때마다 60ms씩 감소, 최소 80ms
    const interval = Math.max(80, baseDropInterval - (l - 1) * 60);
    return interval;
  }

  // ===== 입력 리스너 =====
  const unsubLeft = tetrisInput.on("moveLeft", () => {
    if (!ended && tryMove(-1, 0)) {
      lastActionWasRotate = false;
      resetGravityAndLockTimer();
      render();
    }
  });
  const unsubRight = tetrisInput.on("moveRight", () => {
    if (!ended && tryMove(1, 0)) {
      lastActionWasRotate = false;
      resetGravityAndLockTimer();
      render();
    }
  });
  const unsubSoft = tetrisInput.on("softDrop", () => {
    if (ended) return;
    // 소프트 드랍은 한 칸 내리되, 바닥이면 바로 락 안 하고
    // 락 딜레이 타이머는 tick에서 돌게 둔다.
    if (tryMove(0, 1)) {
      lastActionWasRotate = false;
      resetGravityAndLockTimer();
    }
    render();
  });
  const unsubHard = tetrisInput.on("hardDrop", () => {
    if (ended) return;
    // 하드 드랍은 즉시 바닥까지 + 즉시 락
    while (tryMove(0, 1)) {}
    lastActionWasRotate = false;
    resetGravityAndLockTimer();
    lockPiece();
    render();
  });
  const unsubRotCW = tetrisInput.on("rotateCW", () => {
    if (!ended) {
      if (tryRotate(1)) {
        lastActionWasRotate = true;
        resetGravityAndLockTimer();
        render();
      }
    }
  });
  const unsubRotCCW = tetrisInput.on("rotateCCW", () => {
    if (!ended) {
      if (tryRotate(-1)) {
        lastActionWasRotate = true;
        resetGravityAndLockTimer();
        render();
      }
    }
  });
  const unsubRot180 = tetrisInput.on("rotate180", () => {
    if (!ended) {
      if (tryRotate(2)) {
        lastActionWasRotate = true;
        resetGravityAndLockTimer();
        render();
      }
    }
  });
  const unsubHold = tetrisInput.on("hold", () => {
    if (ended) return;
    doHold();
    lastActionWasRotate = false;
    resetGravityAndLockTimer();
    render();
  });

  /* ===== 7-bag / 큐 ===== */

  function refillBag() {
    nextBag = Object.keys(T_SHAPES);
    for (let i = nextBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextBag[i], nextBag[j]] = [nextBag[j], nextBag[i]];
    }
  }

  function popFromBag() {
    if (nextBag.length === 0) refillBag();
    return nextBag.pop();
  }

  function ensureNextQueueSize() {
    const TARGET = 7;
    while (nextQueue.length < TARGET) {
      nextQueue.push(popFromBag());
    }
  }

  function spawnFromQueue() {
    ensureNextQueueSize();
    const type = nextQueue.shift();
    ensureNextQueueSize();
    spawnWithType(type);
  }

  function spawnWithType(type) {
    current = {
      type,
      x: 3,
      y: 0,
      rot: 0,
    };
    canHold = true;
    lastActionWasRotate = false;
    resetGravityAndLockTimer();
    if (collides(current, board)) {
      endGame();
    }
  }

  /* ===== 충돌 / 이동 / 회전 ===== */

  function collides(piece, brd) {
    const cells = getShapeCells(piece.type, piece.rot);
    for (const [cx, cy] of cells) {
      const x = piece.x + cx;
      const y = piece.y + cy;
      if (x < 0 || x >= T_COLS || y < 0 || y >= T_ROWS) return true;
      if (brd[y][x]) return true;
    }
    return false;
  }

  function tryMove(dx, dy) {
    if (!current) return false;
    const next = {
      ...current,
      x: current.x + dx,
      y: current.y + dy,
    };
    if (collides(next, board)) return false;
    current = next;
    return true;
  }

  function tryRotate(delta) {
    if (!current) return false;
    const next = {
      ...current,
      rot: (current.rot + delta + 4) % 4,
    };
    const kicks = [0, -1, 1];
    for (const k of kicks) {
      const kicked = { ...next, x: next.x + k };
      if (!collides(kicked, board)) {
        current = kicked;
        return true;
      }
    }
    return false;
  }

  function isOnGround() {
    if (!current) return false;
    const test = { ...current, y: current.y + 1 };
    return collides(test, board);
  }

  // T-Spin 여부 판정 (간단 버전: T + 마지막 동작이 회전 + 3코너 룰)
  function isTSpinNow() {
    if (!current) return false;
    if (current.type !== "T") return false;
    if (!lastActionWasRotate) return false;

    const centerX = current.x + 1;
    const centerY = current.y + 1;

    const corners = [
      [centerX - 1, centerY - 1],
      [centerX + 1, centerY - 1],
      [centerX - 1, centerY + 1],
      [centerX + 1, centerY + 1],
    ];

    let occupied = 0;
    for (const [x, y] of corners) {
      if (x < 0 || x >= T_COLS || y < 0 || y >= T_ROWS) {
        occupied++;
      } else if (board[y][x]) {
        occupied++;
      }
    }
    return occupied >= 3;
  }

  function lockPiece() {
    if (!current) return;

    // 현재 위치 기준 T-Spin 여부 먼저 계산
    const tspin = isTSpinNow();

    // 보드에 피스 고정
    const cells = getShapeCells(current.type, current.rot);
    for (const [cx, cy] of cells) {
      const x = current.x + cx;
      const y = current.y + cy;
      if (y < 0 || y >= T_ROWS || x < 0 || x >= T_COLS) continue;
      board[y][x] = current.type;
    }

    // 줄 삭제 + 점수 계산
    clearLinesAndScore(tspin);

    // 다음 피스
    spawnFromQueue();

    // 회전 플래그/타이머 리셋
    lastActionWasRotate = false;
    resetGravityAndLockTimer();
  }

  function clearLinesAndScore(isTSpin) {
    let cleared = 0;

    let write = T_ROWS - 1;
    for (let y = T_ROWS - 1; y >= 0; y--) {
      const full = board[y].every((c) => c);
      if (!full) {
        if (write !== y) {
          board[write] = board[y];
        }
        write--;
      } else {
        cleared++;
      }
    }
    for (let y = write; y >= 0; y--) {
      board[y] = new Array(T_COLS).fill(null);
    }

    // 점수/레벨/콤보/백투백/올클리어 처리
    applyScoring(cleared, isTSpin);
  }

  function applyScoring(linesCleared, isTSpin) {
    let gained = 0;
    let base = 0;
    let b2bBonus = 0;
    let comboBonus = 0;
    let allClearBonus = 0;

    // 레벨은 총 제거한 라인 수로 계산 (10줄당 +1레벨)
    const oldLevel = level;

    if (linesCleared > 0) {
      totalLines += linesCleared;
      level = Math.floor(totalLines / 10) + 1;

      if (onLinesChange) onLinesChange(totalLines);
      if (onLevelChange && level !== oldLevel) onLevelChange(level);
    }

    // 기본 점수 (간단 가이드라인 버전)
    const levelMul = level;

    const b2bCandidate =
      isTSpin && linesCleared > 0 ? true : linesCleared === 4;

    if (isTSpin) {
      if (linesCleared === 0) {
        base = 400;
      } else if (linesCleared === 1) {
        base = 800;
      } else if (linesCleared === 2) {
        base = 1200;
      } else if (linesCleared >= 3) {
        base = 1600;
      }
    } else {
      if (linesCleared === 1) base = 100;
      else if (linesCleared === 2) base = 300;
      else if (linesCleared === 3) base = 500;
      else if (linesCleared >= 4) base = 800;
    }

    base *= levelMul;

    // 콤보
    if (linesCleared > 0) {
      combo++;
      if (combo < 0) combo = 0;
      if (combo >= 1) {
        comboBonus = combo * 50;
      }
    } else {
      combo = -1;
    }

    // Back-to-Back
    if (b2bCandidate && linesCleared > 0) {
      if (backToBack) {
        b2bBonus = Math.floor(base * 0.5); // 50% 보너스
      }
      backToBack = true;
    } else if (linesCleared > 0) {
      backToBack = false;
    }

    // 올 클리어
    if (linesCleared > 0 && isBoardEmpty(board)) {
      allClearBonus = 1800;
    }

    gained = base + b2bBonus + comboBonus + allClearBonus;
    if (gained > 0) {
      score += gained;
      if (onScoreChange) {
        onScoreChange(score, {
          gained,
          base,
          b2bBonus,
          comboBonus,
          allClearBonus,
          linesCleared,
          isTSpin,
          isBackToBack: b2bCandidate,
          backToBackActive: backToBack,
          combo,
          level,
          totalLines,
        });
      }
    }
  }

  function doHold() {
    if (!current || !canHold) return;

    if (holdType == null) {
      holdType = current.type;
      spawnFromQueue();
    } else {
      const swap = holdType;
      holdType = current.type;
      spawnWithType(swap);
    }
    canHold = false;
  }

  /* ===== 렌더링 ===== */

  // 필드: 퍼센트 기반 + 고스트 블록
  function renderField() {
    if (!fieldEl) return;
    const cellW = 100 / T_COLS;
    const cellH = 100 / T_ROWS;

    fieldEl.innerHTML = "";

    // 고정/현재 블록용
    const drawAt = (x, y, type) => {
      const div = createCellDivPercent(
        `${x * cellW}%`,
        `${y * cellH}%`,
        `${cellW}%`,
        `${cellH}%`,
        T_COLORS[type]
      );
      fieldEl.appendChild(div);
    };

    // 고스트용
    const drawGhostAt = (x, y) => {
      const div = createCellDivPercent(
        `${x * cellW}%`,
        `${y * cellH}%`,
        `${cellW}%`,
        `${cellH}%`,
        "transparent"
      );
      div.style.background = "rgba(255,255,255,0.06)";
      div.style.border = "1px dashed rgba(255,255,255,0.45)";
      div.style.borderRadius = "2px";
      fieldEl.appendChild(div);
    };

    // 1) 고정 블럭
    for (let y = 0; y < T_ROWS; y++) {
      for (let x = 0; x < T_COLS; x++) {
        const type = board[y][x];
        if (!type) continue;
        drawAt(x, y, type);
      }
    }

    // 2) 현재 피스 + 고스트
    if (current) {
      // 고스트 위치 계산
      let ghost = { ...current };
      while (true) {
        const next = { ...ghost, y: ghost.y + 1 };
        if (collides(next, board)) break;
        ghost = next;
      }

      const ghostCells = getShapeCells(ghost.type, ghost.rot);
      for (const [cx, cy] of ghostCells) {
        const x = ghost.x + cx;
        const y = ghost.y + cy;
        if (y < 0 || y >= T_ROWS || x < 0 || x >= T_COLS) continue;
        drawGhostAt(x, y);
      }

      // 실제 현재 피스
      const cells = getShapeCells(current.type, current.rot);
      for (const [cx, cy] of cells) {
        const x = current.x + cx;
        const y = current.y + cy;
        if (y < 0 || y >= T_ROWS || x < 0 || x >= T_COLS) continue;

        const div = createCellDivPercent(
          `${x * cellW}%`,
          `${y * cellH}%`,
          `${cellW}%`,
          `${cellH}%`,
          T_COLORS[current.type]
        );
        div.style.boxShadow = "0 0 6px rgba(0,0,0,0.6)";
        fieldEl.appendChild(div);
      }
    }
  }

  // HOLD: 4x4 정사각 그리드 중앙 정렬
  function renderHold() {
    if (!holdEl) return;
    holdEl.innerHTML = "";
    if (!holdType) return;

    const rect = holdEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const type = holdType;
    const cells = getShapeCells(type, 0);

    const cols = 4;
    const rows = 4;

    const cellSize = Math.min(rect.width / cols, rect.height / rows);
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const originX = (rect.width - totalW) / 2;
    const originY = (rect.height - totalH) / 2;

    const scale = 0.8;

    // bounding box
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const [cx, cy] of cells) {
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    }
    const pieceW = maxX - minX + 1;
    const pieceH = maxY - minY + 1;

    const offsetX = (cols - pieceW) / 2 - minX;
    const offsetY = (rows - pieceH) / 2 - minY;

    for (const [cx, cy] of cells) {
      const gx = cx + offsetX;
      const gy = cy + offsetY;

      const innerSize = cellSize * scale;
      const cellOriginX = originX + gx * cellSize + (cellSize - innerSize) / 2;
      const cellOriginY = originY + gy * cellSize + (cellSize - innerSize) / 2;

      const div = createCellDivPx(
        cellOriginX,
        cellOriginY,
        innerSize,
        T_COLORS[type]
      );
      holdEl.appendChild(div);
    }
  }

  // NEXT: 최대 7개, 세로 정렬, 정사각 셀
  function renderNext() {
    if (!nextEl) return;
    nextEl.innerHTML = "";

    const n = Math.min(nextQueue.length, 7);
    if (n === 0) return;

    const rect = nextEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const cols = 4;
    const rowsPerPiece = 3;
    const gapRows = 1;
    const totalRows = rowsPerPiece * n + gapRows * (n - 1);

    const cellSize = Math.min(rect.width / cols, rect.height / totalRows);
    const totalW = cols * cellSize;
    const totalH = totalRows * cellSize;
    const originX = (rect.width - totalW) / 2;
    const originY = (rect.height - totalH) / 2;

    const scale = 0.85;

    for (let i = 0; i < n; i++) {
      const type = nextQueue[i];
      const cells = getShapeCells(type, 0);

      // bounding box
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const [cx, cy] of cells) {
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
      }
      const pieceW = maxX - minX + 1;
      const pieceH = maxY - minY + 1;

      const offsetX = (cols - pieceW) / 2 - minX;
      const offsetY = (rowsPerPiece - pieceH) / 2 - minY;

      const baseRow = i * (rowsPerPiece + gapRows);

      for (const [cx, cy] of cells) {
        const gx = cx + offsetX;
        const gy = cy + offsetY + baseRow;

        const innerSize = cellSize * scale;
        const cellOriginX = originX + gx * cellSize + (cellSize - innerSize) / 2;
        const cellOriginY = originY + gy * cellSize + (cellSize - innerSize) / 2;

        const div = createCellDivPx(
          cellOriginX,
          cellOriginY,
          innerSize,
          T_COLORS[type]
        );
        nextEl.appendChild(div);
      }
    }
  }

  function render() {
    renderField();
    renderHold();
    renderNext();
  }

  function tick(ts) {
    if (ended) return;

    if (!lastTickTime) lastTickTime = ts;
    const dt = ts - lastTickTime;
    lastTickTime = ts;

    fallElapsed += dt;

    const grounded = isOnGround();

    if (grounded) {
      lockElapsed += dt;
    } else {
      lockElapsed = 0;
    }

    const currentInterval = getCurrentDropInterval();

    // 자동 낙하: 바닥이 아닐 때만 한 칸 내림
    if (fallElapsed >= currentInterval && !grounded) {
      tryMove(0, 1);
      fallElapsed = 0;
    }

    // 바닥에 닿은 상태에서 락 딜레이 경과 시 확정
    if (grounded && lockElapsed >= LOCK_DELAY) {
      lockPiece();
      fallElapsed = 0;
      lockElapsed = 0;
    }

    render();
    rafId = requestAnimationFrame(tick);
  }

  function endGame() {
    ended = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (fieldEl) {
      fieldEl.style.filter = "grayscale(100%)";
      fieldEl.style.opacity = "0.4";
    }
    if (onGameOver) onGameOver();
  }

  /* ===== 초기 시작 ===== */
  ensureNextQueueSize();
  spawnFromQueue();
  render();
  rafId = requestAnimationFrame(tick);

  // 초기 점수 콜백
  if (onScoreChange) onScoreChange(score, {
    gained: 0,
    base: 0,
    b2bBonus: 0,
    comboBonus: 0,
    allClearBonus: 0,
    linesCleared: 0,
    isTSpin: false,
    isBackToBack: false,
    backToBackActive: false,
    combo,
    level,
    totalLines,
  });
  if (onLinesChange) onLinesChange(totalLines);
  if (onLevelChange) onLevelChange(level);

  /* ===== cleanup 반환 ===== */
  return function cleanup() {
    ended = true;
    if (rafId) cancelAnimationFrame(rafId);
    unsubLeft && unsubLeft();
    unsubRight && unsubRight();
    unsubSoft && unsubSoft();
    unsubHard && unsubHard();
    unsubRotCW && unsubRotCW();
    unsubRotCCW && unsubRotCCW();
    unsubRot180 && unsubRot180();
    unsubHold && unsubHold();
  };
}
