import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  reload,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Cloudinary 설정
const CLOUDINARY_CLOUD_NAME = "dkl4wukal"; // 본인 cloud name
const CLOUDINARY_UPLOAD_PRESET = "profile image";   // Unsigned preset 이름
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// UI 템플릿
document.body.innerHTML = `
<main class="app-root">

  <style>
    /* 이름 변경 모달 */
    .overlay {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
    }
    .overlay[hidden] { display: none !important; }
    body.modal-open { overflow: hidden; }

    .modal {
      width: min(92vw, 420px);
      border-radius: 16px;
      padding: 20px;
      color: #fff;
      background: linear-gradient(180deg, rgba(20,28,42,0.85), rgba(20,28,42,0.68));
      border: 1px solid rgba(255,255,255,0.22);
      backdrop-filter: blur(16px) saturate(120%);
      -webkit-backdrop-filter: blur(16px) saturate(120%);
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }
    .modal-title { margin: 0 0 6px; font-size: 20px; font-weight: 700; }
    .modal-desc { margin: 0 0 12px; opacity: .9; }

    .modal-input {
      width: min(9000px, 90%); 
      height: 44px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.35);
      background: rgba(0,0,0,0.25);
      color: #fff;
      outline: none;
    }

    .modal-actions {
      display: flex; gap: 10px; justify-content: flex-end;
      margin-top: 16px;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.28);
      box-shadow: 0 12px 28px rgba(0,0,0,.45);
      transition: background .2s ease, box-shadow .2s ease, transform .05s ease;
      cursor: pointer; color: #fff;
      backdrop-filter: blur(12px) saturate(140%);
      -webkit-backdrop-filter: blur(12px) saturate(140%);
    }
    .btn-primary {
      background: #20d07a; color: #0a1a12; font-weight: 700;
      border-color: rgba(0,0,0,0.15);
    }
    .btn-primary:hover { filter: brightness(1.05); box-shadow: 0 16px 32px rgba(0,0,0,.5); }
    .btn-primary:active, .btn-secondary:active { transform: translateY(1px); }
    .btn-secondary {
      background: rgba(255,255,255,0.14);
      border-color: rgba(255,255,255,0.28);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.22); }
  </style>

  <section id="auth-view" aria-live="polite" class="content">
    <h2 id="panel-title" style="margin:0 0 12px;">로그인</h2>
    <form id="login-form">
      <div>
        <input id="login-email" type="email" autocomplete="email" placeholder="이메일" required />
      </div>
      <div>
        <input id="login-password" type="password" autocomplete="current-password" placeholder="비밀번호" required />
      </div>
      <div>
        <button id="login-btn" type="submit">로그인</button>
      </div>
    </form>

    <p id="to-signup">
      계정이 없나요?
      <button id="go-signup" type="button">회원가입으로 이동</button>
    </p>

    <form id="signup-form" hidden>
      <div>
        <input id="signup-email" type="email" autocomplete="email" placeholder="이메일" required />
      </div>
      <div>
        <input id="signup-password" type="password" autocomplete="new-password" placeholder="비밀번호" required />
      </div>
      <div>
        <button id="signup-btn" type="submit">회원가입</button>
      </div>
      <p>
        이미 계정이 있나요?
        <button id="go-login" type="button">로그인으로 이동</button>
      </p>
    </form>

    <p id="message" role="status"></p>
  </section>

  <header id="topbar" class="topbar" hidden>
    <div class="brand">TeTRIS</div>
    <div class="grow"></div>
    <div id="profile" class="profile" aria-haspopup="true">
      <img id="profile-img" alt="프로필" class="avatar" />
      <span id="profile-name" class="profile-name"></span>
      <button id="profile-toggle" class="profile-toggle" aria-label="프로필 메뉴" aria-expanded="false">▾</button>
      <div id="profile-menu" class="profile-menu" hidden>
        <button id="change-name" type="button">이름 변경</button>
        <button id="change-photo" type="button">프로필 이미지 변경</button>
        <button id="logout-btn" type="button">로그아웃</button>
      </div>
      <input id="photo-input" type="file" accept="image/*" hidden />
    </div>
  </header>

  <section id="content-area" class="content-area" hidden></section>

  <!-- 이름 변경 모달 -->
  <div id="name-modal-overlay" class="overlay" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="name-modal-title">
      <h3 id="name-modal-title" class="modal-title">이름 변경</h3>
      <p class="modal-desc">표시할 이름을 입력하세요.</p>
      <input id="name-input" type="text" class="modal-input" maxlength="40" />
      <div class="modal-actions">
        <button id="name-cancel" type="button" class="btn-secondary">취소</button>
        <button id="name-save" type="button" class="btn-primary">완료</button>
      </div>
    </div>
  </div>

</main>
`;

const $ = (id) => document.getElementById(id);

// Auth 엘리먼트
const authView = $("auth-view");
const msg = $("message");
const loginForm = $("login-form");
const loginEmail = $("login-email");
const loginPassword = $("login-password");
const signupForm = $("signup-form");
const signupEmail = $("signup-email");
const signupPassword = $("signup-password");
const goSignup = $("go-signup");
const goLogin = $("go-login");
const toSignupRow = $("to-signup");
const panelTitle = $("panel-title");

// 상단바 엘리먼트
const topbar = $("topbar");
const contentArea = $("content-area");
const profile = $("profile");
const profileImg = $("profile-img");
const profileName = $("profile-name");
const profileToggle = $("profile-toggle");
const profileMenu = $("profile-menu");
const changeNameBtn = $("change-name");
const changePhotoBtn = $("change-photo");
const logoutBtn = $("logout-btn");
const photoInput = $("photo-input");

// 이름 변경 모달 엘리먼트
const nameModalOverlay = $("name-modal-overlay");
const nameInput = $("name-input");
const nameSave = $("name-save");
const nameCancel = $("name-cancel");

// Helpers
const show = (el) => (el && (el.hidden = false));
const hide = (el) => (el && (el.hidden = true));
const setMsg = (text) => (msg.textContent = text || "");

/* ===== 설정 상태 저장/로드 ===== */
const SETTINGS_KEY = "tetris-settings-v1";
const defaultSettings = {
  audio: { volume: 0.8, muted: false },
  controls: {
    moveLeft: "ArrowLeft",
    moveRight: "ArrowRight",
    hold: "KeyC",
    softDrop: "ArrowDown",
    hardDrop: "Space",
    rotateCW: "KeyX",
    rotateCCW: "KeyZ",
    rotate180: "KeyA",
    openChat: "Enter",
  }
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return {
      audio: { ...defaultSettings.audio, ...(parsed.audio || {}) },
      controls: { ...defaultSettings.controls, ...(parsed.controls || {}) },
    };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

let settings = loadSettings();

/* ===== 전역 입력 매핑(조작 키) ===== */
const CONTROL_ACTIONS = [
  "moveLeft", "moveRight", "hold", "softDrop", "hardDrop",
  "rotateCW", "rotateCCW", "rotate180", "openChat",
];

const CONTROL_LABELS = {
  moveLeft: "좌 이동",
  moveRight: "우 이동",
  hold: "홀드",
  softDrop: "빠르게 내리기",
  hardDrop: "하드 드롭",
  rotateCW: "시계방향 회전",
  rotateCCW: "시계 반대 회전",
  rotate180: "180도 회전",
  openChat: "채팅 열기",
};

function codeToLabel(code) {
  if (!code) return "미지정";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const map = { Space: "Space", Enter: "Enter", Tab: "Tab", Escape: "Esc" };
  return map[code] || code;
}

let controlMap = {}; // e.code -> action
const actionListeners = new Map(); // action -> Set(callback)
function rebuildControlMap() {
  controlMap = {};
  const c = settings.controls || {};
  for (const a of CONTROL_ACTIONS) {
    const code = c[a];
    if (code) controlMap[code] = a;
  }
}
function emitAction(action, ev) {
  const set = actionListeners.get(action);
  if (!set) return;
  for (const cb of set) { try { cb(ev); } catch {} }
}
function onAction(action, cb) {
  if (!CONTROL_ACTIONS.includes(action)) return () => {};
  let set = actionListeners.get(action);
  if (!set) { set = new Set(); actionListeners.set(action, set); }
  set.add(cb);
  return () => { set.delete(cb); };
}

// 입력 포커스가 폼 요소일 때는 전역 조작 무시
function isTypingContext() {
  const ae = document.activeElement;
  if (!ae) return false;
  const tag = (ae.tagName || "").toLowerCase();
  const editable = ae.isContentEditable;
  return editable || tag === "input" || tag === "textarea" || tag === "select";
}

// 전역 keydown -> action
window.addEventListener("keydown", (e) => {
  if (window.__rebindingInProgress) return;
  if (isTypingContext()) return;
  const action = controlMap[e.code];
  if (!action) return;
  if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
    e.preventDefault();
  }
  emitAction(action, e);
  const testOut = document.getElementById("controls-test-output");
  if (testOut) testOut.textContent = `${CONTROL_LABELS[action]} (${codeToLabel(e.code)})`;
});

// 외부에서 사용: 게임 로직에서 구독 가능
window.tetrisInput = {
  on: onAction,
  off: (a, cb) => { const set = actionListeners.get(a); if (set) set.delete(cb); },
  getBindings: () => ({ ...settings.controls })
};

rebuildControlMap();

/* ===== 오디오 컨텍스트/볼륨 적용 ===== */
let audioCtx = null;
let masterGain = null;

async function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    try { await audioCtx.resume(); } catch {}
  }
}

function applyAudioSettings() {
  if (!masterGain) return;
  const vol = settings.audio.muted ? 0 : Math.max(0, Math.min(1, settings.audio.volume));
  masterGain.gain.value = vol;
}

/* 테스트 사운드 */
async function playTestBeep() {
  await ensureAudioContext();
  applyAudioSettings();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = 440;
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.26);
}

/* ===== 홈 메뉴 ===== */
function renderHomeMenu() {
  if (!contentArea) return;
  contentArea.innerHTML = `
    <style>
      .menu-wrap {
        min-height: calc(100vh - 64px);
        display: flex;
        align-items: center;
      }
      .game-menu { margin-left: 28px; }
      .menu-list { display: flex; flex-direction: column; gap: 18px; margin: 0; padding: 0; }
      .menu-link {
        display: inline-block;
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        text-decoration: none;
        cursor: pointer;
      }
      .menu-link:hover { color: #20d07a; text-decoration: underline; }
      .menu-status { margin-top: 12px; opacity: .9; }
    </style>

    <div class="menu-wrap">
      <div class="game-menu" role="navigation" aria-label="게임 메뉴">
        <nav class="menu-list">
          <a href="#" id="menu-single" class="menu-link">싱글 플레이</a>
          <a href="#" id="menu-multi" class="menu-link">멀티 플레이</a>
          <a href="#" id="menu-settings" class="menu-link">세팅</a>
        </nav>
        <p id="menu-status" class="menu-status" aria-live="polite"></p>
      </div>
    </div>
  `;

  const single = document.getElementById("menu-single");
  const multi = document.getElementById("menu-multi");
  const settingsLink = document.getElementById("menu-settings");

  single?.addEventListener("click", (e) => {
    e.preventDefault();
    renderPlayScreen("single");
  });
  multi?.addEventListener("click", (e) => {
    e.preventDefault();
    renderPlayScreen("multi");
  });
  settingsLink?.addEventListener("click", (e) => {
    e.preventDefault();
    openSettings("controls");
  });
}

/* ===== 플레이 화면(싱글/멀티 공용) ===== */
function renderPlayScreen(mode = "single") {
  if (!contentArea) return;
  const title = mode === "multi" ? "멀티 플레이" : "싱글 플레이";
  contentArea.innerHTML = `
    <style>
      .stage-wrap {
        min-height: calc(100vh - 64px);
        display: flex; align-items: center; justify-content: center;
      }
      .stage {
        position: relative;
        width: min(96vw, 1100px);
        height: min(88vh, 720px);
      }
      .top-ui {
        position: absolute; top: -44px; left: 0; right: 0;
        display: flex; align-items: center; justify-content: space-between;
        color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.6);
      }
      .back-btn {
        background: rgba(255,255,255,0.14);
        border: 2px solid rgba(0,0,0,0.9);
        color: #fff; border-radius: 10px;
        padding: 8px 10px; cursor: pointer;
        box-shadow: 0 8px 16px rgba(0,0,0,.35);
      }
      .title { font-weight: 800; letter-spacing: .5px; }

      /* 공용 상자(홀드/넥스트) */
      .box {
        position: absolute;
        background: rgba(16,19,32,0.35);
        border: 3px solid rgba(0,0,0,0.95);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.06) inset, 0 8px 24px rgba(0,0,0,.35);
        backdrop-filter: blur(6px) saturate(140%);
        -webkit-backdrop-filter: blur(6px) saturate(140%);
      }
      .box.left  { left: 0;  top: 6%; width: min(20vw, 180px); height: 25%; }
      .box.right { right: 0; top: 6%; width: min(18vw, 200px); height: 76%; }

      .label {
        position: absolute; top: 10px; left: 12px;
        color: #fff; font-weight: 800; letter-spacing: .5px;
        text-shadow: 0 2px 8px rgba(0,0,0,.55);
      }

      /* 중앙은 PLAYFIELD 박스 없이, 그리드만 */
      .play-grid {
        position: absolute;
        left: 50%; transform: translateX(-50%);
        top: 0; bottom: 0;
        width: min(54vw, 420px);
        display: flex; align-items: center; justify-content: center;
        padding: 12px;
        background: transparent; /* 박스 제거 */
      }
     .field {
  height: 100%;
  aspect-ratio: 10 / 20;

  /* 유리 느낌 핵심 */
  background-color: rgba(20,28,42,0.50);         /* 반투명 어두운 유리 톤 */
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);

  /* 윤곽선/광택 (HOLD/NEXT 상자와 어울리게) */
  border: 3px solid rgba(0,0,0,0.95);
  box-shadow:
    0 10px 24px rgba(0,0,0,.35),
    inset 0 0 0 2px rgba(255,255,255,0.08);
  border-radius: 10px;
  overflow: hidden;

  /* 10×20 그리드 라인 (조금 더 선명) */
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px);
  background-size: calc(100%/10) calc(100%/20);
}



      @media (max-width: 860px) {
        .box.left, .box.right { display:none; }
        .play-grid { width: min(86vw, 520px); }
      }
    </style>

    <div class="stage-wrap">
      <div class="stage">
        <div class="top-ui">
          <button id="play-back" class="back-btn" type="button">← 메뉴</button>
          <div class="title">${title}</div>
          <div style="width:66px"></div>
        </div>

        <div class="box left"><div class="label">HOLD</div></div>

        <!-- 중앙: 그리드만 표시 -->
        <div class="play-grid">
          <div class="field" role="img" aria-label="10×20 grid"></div>
        </div>

        <div class="box right"><div class="label">NEXT</div></div>
      </div>
    </div>
  `;

  document.getElementById("play-back")?.addEventListener("click", () => {
    renderHomeMenu();
  });
}

/* ===== 세팅 화면 (상단 중앙 제목, 아래 콘텐츠) ===== */
function openSettings(initialTab = "controls") {
  renderSettings(initialTab);
}

function renderSettings(initialTab = "controls") {
  if (!contentArea) return;
  contentArea.innerHTML = `
    <style>
      .settings-page { padding: 20px 16px 32px; }
      .settings-title {
        color: #8f62e2ff;
        text-align: center;
        margin: 8px 0 10px;
        font-size: 24px;
        font-weight: 800;
      }
      .settings-actions {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
      }
      .link-btn {
        background: none; border: none; color: #fff; text-decoration: underline;
        cursor: pointer; padding: 0; font: inherit;
      }
      .link-btn:hover { color: #6bc59aff; }

      .settings-body {
        width: min(92vw, 720px);
        margin: 0 auto;
      }

      .tabs { display: flex; gap: 8px; margin-bottom: 12px; justify-content: center; }
      .tab-btn {
        padding: 8px 12px; border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.28);
        background: rgba(255,255,255,0.10);
        color: #fff; cursor: pointer;
      }
      .tab-btn[aria-selected="true"] {
        background: rgba(253, 82, 196, 0.32);
        border-color: rgba(248, 132, 248, 0.45);
      }

      .panel {
        padding: 14px;
        border: 1px solid rgba(219, 126, 255, 0.89);
        border-radius: 10px;
        background: rgba(234, 150, 255, 0.4);
      }
      .row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .row label { min-width: 60px; }
      .grow { flex: 1; }
      input[type="range"] { width: 100%; }
      .desc { opacity: .9; }
      .actions { display: flex; gap: 8px; justify-content: flex-end; }
    </style>

    <div class="settings-page" role="region" aria-label="세팅 페이지">
      <h2 class="settings-title">세팅</h2>
      <div class="settings-actions">
        <button id="settings-back" class="link-btn" type="button">← 메인으로</button>
      </div>
      <section class="settings-body">
        <div class="tabs" role="tablist">
        <button id="tab-controls" class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-controls">조작</button>
        <button id="tab-audio" class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-audio">오디오</button>
        </div>

        <div id="panel-audio" class="panel" role="tabpanel" hidden>
          <div class="row">
            <label for="audio-volume">볼륨</label>
            <div class="grow">
              <input id="audio-volume" type="range" min="0" max="100" step="1" />
            </div>
            <span id="audio-volume-label"></span>
          </div>
          <div class="row">
            <label for="audio-muted">음소거</label>
            <input id="audio-muted" type="checkbox" />
            <span class="desc">음소거 시 모든 효과음이 꺼집니다</span>
          </div>
          <div class="actions">
            <button id="audio-test" type="button" class="tab-btn">테스트 재생</button>
          </div>
        </div>

        <div id="panel-controls" class="panel" role="tabpanel" hidden>
          <style>
            .bind-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
            .bind-name { width: 160px; }
            .bind-key { min-width: 80px; font-weight:700; }
            .bind-actions { display:flex; gap:6px; }
            .hint { opacity:.9; }
            .warn { color: #ffeb3b; }
            .err { color: #ff6b6b; }
            .ok { color: #c8ffdd; }
          </style>
          <div id="controls-bindings"></div>
          <div class="actions" style="margin-top:10px;">
            <button id="controls-reset" type="button" class="tab-btn">기본값으로 초기화</button>
          </div>
          <p class="desc hint">변경하려는 항목의 "변경"을 누르고 원하는 키를 누르세요. ESC로 취소.</p>
          <p id="controls-msg" class="desc" aria-live="polite"></p>
          <div style="margin-top:12px;">
            <strong>테스트:</strong> 아래 영역에서 설정한 키를 눌러 동작을 확인하세요.
            <div id="controls-test-output" class="desc" style="margin-top:6px;">대기중…</div>
          </div>
        </div>
      </section>
    </div>
  `;

  const tabAudio = document.getElementById("tab-audio");
  const tabControls = document.getElementById("tab-controls");
  const panelAudio = document.getElementById("panel-audio");
  const panelControls = document.getElementById("panel-controls");
  const backBtn = document.getElementById("settings-back");

  backBtn?.addEventListener("click", () => {
    renderHomeMenu();  // 메인으로
  });

  function selectTab(which) {
    const audioSelected = which === "audio";
    tabAudio.setAttribute("aria-selected", audioSelected ? "true" : "false");
    tabControls.setAttribute("aria-selected", audioSelected ? "false" : "true");
    panelAudio.hidden = !audioSelected;
    panelControls.hidden = audioSelected;
    if (audioSelected) initAudioPanel(); else initControlsPanel();
  }

  tabAudio.addEventListener("click", () => selectTab("audio"));
  tabControls.addEventListener("click", () => selectTab("controls"));

  // 초기 탭 표시
  selectTab(initialTab);

  function initAudioPanel() {
    const volInput = document.getElementById("audio-volume");
    const volLabel = document.getElementById("audio-volume-label");
    const mutedInput = document.getElementById("audio-muted");
    const testBtn = document.getElementById("audio-test");

    const currentVol = Math.round((settings.audio?.volume ?? 0.8) * 100);
    volInput.value = String(currentVol);
    volLabel.textContent = `${currentVol}%`;
    mutedInput.checked = !!settings.audio?.muted;

    const update = () => {
      const vol = Math.max(0, Math.min(100, parseInt(volInput.value || "0", 10)));
      const muted = !!mutedInput.checked;
      settings.audio = { volume: vol / 100, muted };
      saveSettings(settings);
      ensureAudioContext().then(() => applyAudioSettings());
      volLabel.textContent = `${vol}%`;
    };

    volInput.addEventListener("input", update);
    mutedInput.addEventListener("change", update);
    testBtn.addEventListener("click", async () => { await playTestBeep(); });
  }

  function initControlsPanel() {
    const container = document.getElementById("controls-bindings");
    const msgEl = document.getElementById("controls-msg");
    const resetBtn = document.getElementById("controls-reset");
    if (!container) return;

    function setMsg(t, cls = "") {
      if (!msgEl) return;
      msgEl.className = `desc ${cls}`.trim();
      msgEl.textContent = t || "";
    }

    function render() {
      const c = settings.controls || {};
      container.innerHTML = CONTROL_ACTIONS.map((a) => {
        return `
          <div class="bind-row" data-action="${a}">
            <div class="bind-name">${CONTROL_LABELS[a]}</div>
            <div class="bind-key" id="bind-${a}">${codeToLabel(c[a])}</div>
            <div class="bind-actions">
              <button type="button" class="tab-btn bind-change" data-action="${a}">변경</button>
              <button type="button" class="tab-btn bind-clear" data-action="${a}">지우기</button>
            </div>
          </div>`;
      }).join("");
    }

    function isCodeInUse(code, exceptAction = null) {
      for (const a of CONTROL_ACTIONS) {
        if (a === exceptAction) continue;
        if (settings.controls[a] === code) return a;
      }
      return null;
    }

    function updateBinding(action, code) {
      if (code) {
        const conflict = isCodeInUse(code, action);
        if (conflict) {
          setMsg(`이미 사용 중인 키입니다: ${CONTROL_LABELS[conflict]} ↔ ${CONTROL_LABELS[action]}`, "err");
          return false;
        }
      }
      settings.controls[action] = code || "";
      saveSettings(settings);
      rebuildControlMap();
      const labelEl = document.getElementById(`bind-${action}`);
      if (labelEl) labelEl.textContent = codeToLabel(code);
      setMsg("저장됨", "ok");
      return true;
    }

    function beginRebind(action) {
      window.__rebindingInProgress = true;
      setMsg(`${CONTROL_LABELS[action]} — 설정할 키를 누르세요 (ESC 취소)`, "warn");
      const onKey = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === "Escape") {
          cleanup(); setMsg("취소됨"); return;
        }
        const code = e.code;
        if (updateBinding(action, code)) {
          cleanup();
        }
      };
      const cleanup = () => {
        window.removeEventListener("keydown", onKey, true);
        window.__rebindingInProgress = false;
      };
      window.addEventListener("keydown", onKey, true);
    }

    render();

    container.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.classList.contains("bind-change")) {
        const a = t.getAttribute("data-action");
        if (a) beginRebind(a);
      } else if (t.classList.contains("bind-clear")) {
        const a = t.getAttribute("data-action");
        if (a) updateBinding(a, "");
      }
    });

    resetBtn?.addEventListener("click", () => {
      settings.controls = { ...defaultSettings.controls };
      saveSettings(settings);
      rebuildControlMap();
      render();
      setMsg("기본값으로 초기화됨", "ok");
    });
  }
}

function fallbackName(user) {
  if (!user) return "";
  if (user.displayName) return user.displayName;
  const email = user.email || "";
  return email.includes("@") ? email.split("@")[0] : email;
}

// 유니코드 안전 base64 인코딩
function utf8ToBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
}

function svgAvatar(text) {
  const ch = (text || "U").trim().charAt(0).toUpperCase() || "U";
  const bg = "#2be47f";
  const fg = "#0a1a12";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
  <rect width='64' height='64' rx='32' ry='32' fill='${bg}'/>
  <text x='50%' y='50%' dy='.36em' text-anchor='middle' font-size='36' font-family='system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif' font-weight='700' fill='${fg}'>${ch}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
}

function updateProfileUI(user) {
  const name = fallbackName(user);
  profileName.textContent = name;
  const src = user?.photoURL || svgAvatar(name);
  profileImg.src = src;
}

// 폼 전환
goSignup.addEventListener("click", () => {
  hide(loginForm);
  show(signupForm);
  if (toSignupRow) toSignupRow.hidden = true;
  if (panelTitle) panelTitle.textContent = "회원가입";
  setMsg("");
});

goLogin.addEventListener("click", () => {
  show(loginForm);
  hide(signupForm);
  if (toSignupRow) toSignupRow.hidden = false;
  if (panelTitle) panelTitle.textContent = "로그인";
  setMsg("");
});

// 로그인
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("로그인 중...");
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    setMsg("");
  } catch (err) {
    setMsg(err.message);
  }
});

// 회원가입
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("회원가입 중...");
  try {
    await createUserWithEmailAndPassword(auth, signupEmail.value, signupPassword.value);
    setMsg("회원가입 완료. 자동 로그인됨.");
  } catch (err) {
    setMsg(err.message);
  }
});

// 프로필 메뉴 토글/닫기
function closeMenu() {
  if (!profileMenu) return;
  profileMenu.hidden = true;
  profileMenu.style.display = "none";
  if (profileToggle) profileToggle.setAttribute("aria-expanded", "false");
}
function openMenu() {
  if (!profileMenu) return;
  profileMenu.hidden = false;
  profileMenu.style.display = "flex";
  if (profileToggle) profileToggle.setAttribute("aria-expanded", "true");
}
closeMenu();

// 토글은 전용 버튼/아바타/이름에서만 동작
if (profileToggle) {
  profileToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (profileMenu.hidden) openMenu(); else closeMenu();
  });
}
if (profileImg) {
  profileImg.addEventListener("click", (e) => {
    e.stopPropagation();
    if (profileMenu.hidden) openMenu(); else closeMenu();
  });
}
if (profileName) {
  profileName.addEventListener("click", (e) => {
    e.stopPropagation();
    if (profileMenu.hidden) openMenu(); else closeMenu();
  });
}
if (profileMenu) {
  profileMenu.addEventListener("click", (e) => e.stopPropagation());
}
document.addEventListener("click", () => closeMenu());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMenu();
    // 모달이 열려 있으면 ESC로 닫기
    if (nameModalOverlay && !nameModalOverlay.hidden) {
      e.stopPropagation();
      closeNameModal();
    }
  }
});

// 이름 변경 모달 동작
function openNameModal() {
  const user = auth.currentUser;
  if (!user) return;
  const current = fallbackName(user);
  if (nameInput) {
    nameInput.value = current;
    try { nameInput.setSelectionRange(0, current.length); } catch {}
  }
  if (nameModalOverlay) nameModalOverlay.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => nameInput && nameInput.focus(), 0);
}
function closeNameModal() {
  if (nameModalOverlay) nameModalOverlay.hidden = true;
  document.body.classList.remove("modal-open");
}

// 이름 변경: 모달 열기
changeNameBtn.addEventListener("click", () => {
  closeMenu();
  openNameModal();
});

async function saveName() {
  const user = auth.currentUser;
  if (!user) return;
  const name = (nameInput?.value || "").trim();
  if (!name) { setMsg("이름을 입력하세요."); nameInput?.focus(); return; }
  try {
    setMsg("이름 변경 중...");
    await updateProfile(user, { displayName: name });
    await reload(user);
    updateProfileUI(auth.currentUser);
    closeNameModal();
    setMsg("");
  } catch (err) {
    setMsg(err?.message || "이름 변경 중 오류가 발생했습니다.");
  }
}
nameSave?.addEventListener("click", saveName);
nameCancel?.addEventListener("click", closeNameModal);

// 모달 바깥 클릭 시 닫기
nameModalOverlay?.addEventListener("click", (e) => {
  if (e.target === nameModalOverlay) closeNameModal();
});
// Enter로 저장
nameInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); saveName(); }
});

// 이미지 리사이즈 → Blob
async function fileToResizedBlob(file, maxSize = 512, mime = "image/jpeg", quality = 0.9) {
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = (e) => reject(e);
    fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(e);
    i.src = dataUrl;
  });
  const w = img.width, h = img.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, tw, th);
  const blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
  return blob || (await (await fetch(canvas.toDataURL("image/png"))).blob());
}

// Cloudinary 업로드
async function uploadToCloudinary(blob, fileName = "profile.jpg") {
  const form = new FormData();
  form.append("file", blob, fileName);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "이미지 업로드 실패");
  return data.secure_url; // photoURL에 저장할 공개 URL
}

// 프로필 이미지 변경: Cloudinary 업로드 → public URL → updateProfile
changePhotoBtn.addEventListener("click", () => {
  photoInput.click();
});
photoInput.addEventListener("change", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;

  setMsg("이미지 업로드 중...");
  try {
    const blob = await fileToResizedBlob(file, 512, "image/jpeg", 0.9);
    const publicUrl = await uploadToCloudinary(blob, file.name || "profile.jpg");
    await updateProfile(user, { photoURL: publicUrl });
    await reload(user);
    updateProfileUI(auth.currentUser);
    closeMenu();
    setMsg("");
  } catch (err) {
    setMsg(err?.message || "프로필 이미지 업데이트 중 오류가 발생했습니다.");
  } finally {
    photoInput.value = "";
  }
});

// 로그아웃
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    setMsg(err.message);
  }
});

// 인증 상태 반영
onAuthStateChanged(auth, (user) => {
  if (user) {
    updateProfileUI(user);
    hide(authView);
    show(topbar);
    show(contentArea);
    renderHomeMenu();
    setMsg("");
  } else {
    show(authView);
    hide(topbar);
    hide(contentArea);
    show(loginForm);
    hide(signupForm);
    if (toSignupRow) toSignupRow.hidden = false;
    if (panelTitle) panelTitle.textContent = "로그인";
  }
});
