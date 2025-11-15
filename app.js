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
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, onSnapshot, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Cloudinary 설정
const CLOUDINARY_CLOUD_NAME = "dkl4wukal"; // 본인 cloud name
const CLOUDINARY_UPLOAD_PRESET = "profile image";   // Unsigned preset 이름
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI 템플릿
document.body.innerHTML = `
<main class="app-root">

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
    try { audioCtx.resume(); } catch {}
  }
}

function applyAudioSettings() {
  if (!masterGain) return;
  const vol = settings.audio.muted ? 0 : Math.max(0, Math.min(1, settings.audio.volume));
  masterGain.gain.value = vol;
}

/* 테스트 사운드 */
function playTestBeep() {
  ensureAudioContext();
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
    renderMultiEntry(); // 진입 화면
  });
  settingsLink?.addEventListener("click", (e) => {
    e.preventDefault();
    openSettings("controls");
  });
}

/* ===== 플레이 화면(싱글 전용) ===== */
function renderPlayScreen(mode = "single") {
  if (!contentArea) return;
  if (mode !== "single") {
    console.warn("[renderPlayScreen] Single-player only. Ignored mode:", mode);
    return;
  }
  const title = "싱글 플레이";
  contentArea.innerHTML = `

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

/* ===== 멀티플레이 실제 게임 화면 ===== */
function renderMultiPlay(roomRef, roomCode) {
  if (!contentArea) return;
  const user = auth.currentUser;

  // 기본 레이아웃: 왼쪽 내 세트 + 오른쪽 영역(동적으로 채움)
  contentArea.innerHTML = `
    <div
      style="
        min-height: calc(100vh - 64px);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 80px;
      "
    >
      <!-- 왼쪽: 내 세트(고정) -->
      <div
        style="
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 16px;
        "
      >
        <!-- HOLD -->
        <div
          style="
            width: 130px;
            height: 220px;
            background: rgba(16,19,32,0.35);
            border: 3px solid rgba(0,0,0,0.95);
            box-shadow:
              0 0 0 2px rgba(255,255,255,0.06) inset,
              0 8px 24px rgba(0,0,0,.35);
            backdrop-filter: blur(6px) saturate(140%);
            -webkit-backdrop-filter: blur(6px) saturate(140%);
            position: relative;
          "
        >
          <div
            style="
              position:absolute; top:10px; left:12px;
              color:#fff; font-weight:800; letter-spacing:.5px;
              text-shadow:0 2px 8px rgba(0,0,0,.55);
            "
          >
            HOLD
          </div>
        </div>

        <!-- 메인 필드 + 이름 -->
        <div
          style="
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:8px;
          "
        >
          <div
            class="my-field"
            data-uid=""
            style="
              width: 260px;
              aspect-ratio: 10 / 20;
              background-color: rgba(20,28,42,0.50);
              backdrop-filter: blur(10px) saturate(140%);
              -webkit-backdrop-filter: blur(10px) saturate(140%);
              border: 3px solid rgba(0,0,0,0.95);
              box-shadow:
                0 10px 24px rgba(0,0,0,.35),
                inset 0 0 0 2px rgba(255,255,255,0.08);
              border-radius: 10px;
              overflow: hidden;
              background-image:
                linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px);
              background-size: calc(100%/10) calc(100%/20);
            "
          ></div>
          <div
            id="player-name-me"
            style="
              color:#fff;
              font-weight:600;
              text-shadow:0 2px 8px rgba(0,0,0,.6);
            "
          ></div>
        </div>

        <!-- NEXT -->
        <div
          style="
            width: 130px;
            height: calc(260px * 2);
            background: rgba(16,19,32,0.35);
            border: 3px solid rgba(0,0,0,0.95);
            box-shadow:
              0 0 0 2px rgba(255,255,255,0.06) inset,
              0 8px 24px rgba(0,0,0,.35);
            backdrop-filter: blur(6px) saturate(140%);
            -webkit-backdrop-filter: blur(6px) saturate(140%);
            position: relative;
          "
        >
          <div
            style="
              position:absolute; top:10px; left:12px;
              color:#fff; font-weight:800; letter-spacing:.5px;
              text-shadow:0 2px 8px rgba(0,0,0,.55);
            "
          >
            NEXT
          </div>
        </div>
      </div>

      <!-- 오른쪽: 상대들 영역 (동적 구성) -->
      <div
        id="right-side"
        style="
          min-width: 320px;
          max-width: 720px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        "
      ></div>
    </div>
  `;

  const meNameEl = document.getElementById("player-name-me");
  const myFieldEl = contentArea.querySelector(".my-field");
  const rightSide = document.getElementById("right-side");

  if (!roomRef) return;

  // players 스냅샷 구독
  onSnapshot(collection(roomRef, "players"), (snap) => {
    const players = [];
    snap.forEach((docSnap) => players.push(docSnap.data()));

    const myUid = user?.uid;
    const me = players.find((p) => p.uid === myUid) || null;
    const opponents = players.filter((p) => p.uid !== myUid);

    // 내 이름, uid 세팅
    if (meNameEl) {
      meNameEl.textContent = me ? (me.name || "나") : "나";
    }
    if (myFieldEl && myUid) {
      myFieldEl.setAttribute("data-uid", myUid);
    }

    if (!rightSide) return;

    // 상대 없음
    if (opponents.length === 0) {
      rightSide.innerHTML = `
        <div style="color:#fff; text-shadow:0 2px 8px rgba(0,0,0,.6);">
          상대를 기다리는 중...
        </div>
      `;
      return;
    }

    // 상대 1명: 기존처럼 큰 세트 (HOLD/필드/NEXT)
    if (opponents.length === 1) {
      const opp = opponents[0];
      rightSide.innerHTML = `
        <div
          style="
            display: flex;
            align-items: flex-start;
            justify-content: center;
            gap: 16px;
          "
        >
          <!-- HOLD -->
          <div
            style="
              width: 130px;
              height: 220px;
              background: rgba(16,19,32,0.35);
              border: 3px solid rgba(0,0,0,0.95);
              box-shadow:
                0 0 0 2px rgba(255,255,255,0.06) inset,
                0 8px 24px rgba(0,0,0,.35);
              backdrop-filter: blur(6px) saturate(140%);
              -webkit-backdrop-filter: blur(6px) saturate(140%);
              position: relative;
            "
          >
            <div
              style="
                position:absolute; top:10px; left:12px;
                color:#fff; font-weight:800; letter-spacing:.5px;
                text-shadow:0 2px 8px rgba(0,0,0,.55);
              "
            >
              HOLD
            </div>
          </div>

          <!-- 메인 필드 + 이름 -->
          <div
            style="
              display:flex;
              flex-direction:column;
              align-items:center;
              gap:8px;
            "
          >
            <div
              class="opp-field"
              data-uid="${opp.uid || ""}"
              style="
                width: 260px;
                aspect-ratio: 10 / 20;
                background-color: rgba(20,28,42,0.50);
                backdrop-filter: blur(10px) saturate(140%);
                -webkit-backdrop-filter: blur(10px) saturate(140%);
                border: 3px solid rgba(0,0,0,0.95);
                box-shadow:
                  0 10px 24px rgba(0,0,0,.35),
                  inset 0 0 0 2px rgba(255,255,255,0.08);
                border-radius: 10px;
                overflow: hidden;
                background-image:
                  linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px);
                background-size: calc(100%/10) calc(100%/20);
              "
            ></div>
            <div
              style="
                color:#fff;
                font-weight:600;
                text-shadow:0 2px 8px rgba(0,0,0,.6);
              "
            >
              ${opp.name || "상대"}
            </div>
          </div>

          <!-- NEXT -->
          <div
            style="
              width: 130px;
              height: calc(260px * 2);
              background: rgba(16,19,32,0.35);
              border: 3px solid rgba(0,0,0,0.95);
              box-shadow:
                0 0 0 2px rgba(255,255,255,0.06) inset,
                0 8px 24px rgba(0,0,0,.35);
              backdrop-filter: blur(6px) saturate(140%);
              -webkit-backdrop-filter: blur(6px) saturate(140%);
              position: relative;
            "
          >
            <div
              style="
                position:absolute; top:10px; left:12px;
                color:#fff; font-weight:800; letter-spacing:.5px;
                text-shadow:0 2px 8px rgba(0,0,0,.55);
              "
            >
              NEXT
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 🔥 상대 2명 이상: 각 플레이어마다 작은 HOLD / FIELD / NEXT 세트 카드
    const oppCardsHtml = opponents
      .map((p) => {
        return `
          <div
            style="
              display:flex;
              flex-direction:column;
              align-items:center;
              gap:4px;
            "
          >
            <div
              style="
                display:flex;
                align-items:flex-start;
                justify-content:center;
                gap:4px;
              "
            >
              <!-- HOLD (mini) -->
              <div
                style="
                  width: 40px;
                  height: 80px;
                  background: rgba(16,19,32,0.35);
                  border: 2px solid rgba(0,0,0,0.9);
                  box-shadow:
                    0 0 0 1px rgba(255,255,255,0.05) inset,
                    0 4px 10px rgba(0,0,0,.30);
                  backdrop-filter: blur(4px) saturate(130%);
                  -webkit-backdrop-filter: blur(4px) saturate(130%);
                  position: relative;
                "
              >
                <div
                  style="
                    position:absolute; top:6px; left:6px;
                    color:#fff; font-size:9px; font-weight:700;
                    text-shadow:0 1px 4px rgba(0,0,0,.6);
                  "
                >
                  HOLD
                </div>
              </div>

              <!-- FIELD (mini) -->
              <div
                class="opp-field"
                data-uid="${p.uid || ""}"
                style="
                  width: 110px;
                  aspect-ratio: 10 / 20;
                  background-color: rgba(20,28,42,0.50);
                  backdrop-filter: blur(8px) saturate(130%);
                  -webkit-backdrop-filter: blur(8px) saturate(130%);
                  border: 2px solid rgba(0,0,0,0.9);
                  box-shadow:
                    0 6px 14px rgba(0,0,0,.30),
                    inset 0 0 0 1px rgba(255,255,255,0.08);
                  border-radius: 8px;
                  overflow: hidden;
                  background-image:
                    linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px);
                  background-size: calc(100%/10) calc(100%/20);
                "
              ></div>

              <!-- NEXT (mini) -->
              <div
                style="
                  width: 40px;
                  height: 80px;
                  background: rgba(16,19,32,0.35);
                  border: 2px solid rgba(0,0,0,0.9);
                  box-shadow:
                    0 0 0 1px rgba(255,255,255,0.05) inset,
                    0 4px 10px rgba(0,0,0,.30);
                  backdrop-filter: blur(4px) saturate(130%);
                  -webkit-backdrop-filter: blur(4px) saturate(130%);
                  position: relative;
                "
              >
                <div
                  style="
                    position:absolute; top:6px; left:6px;
                    color:#fff; font-size:9px; font-weight:700;
                    text-shadow:0 1px 4px rgba(0,0,0,.6);
                  "
                >
                  NEXT
                </div>
              </div>
            </div>

            <!-- 이름 -->
            <div
              style="
                color:#fff;
                font-size: 13px;
                font-weight:600;
                text-shadow:0 2px 6px rgba(0,0,0,.6);
                text-align:center;
                max-width: 200px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
            >
              ${p.name || "상대"}
            </div>
          </div>
        `;
      })
      .join("");

    rightSide.innerHTML = `
      <div
        style="
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          justify-items: center;
          width: 100%;
        "
      >
        ${oppCardsHtml}
      </div>
    `;
  });
}


/* ===== 멀티플레이 진입 화면 ===== */
function renderMultiEntry() {
  if (!contentArea) return;
  contentArea.innerHTML = `

    <div class="multi-wrap">
      <div class="multi-card" role="region" aria-label="멀티플레이어 메뉴">
        <h2 class="multi-title">멀티 플레이</h2>
        <div class="multi-actions">
          <button id="btn-create-room" type="button" class="multi-btn">방 만들기</button>
          <button id="btn-join-room" type="button" class="multi-btn">방 참가하기</button>
        </div>
        <p id="multi-status" class="multi-status" aria-live="polite"></p>
        <div class="back-link">
          <button id="multi-back" type="button" class="link-btn">메인 메뉴로</button>
        </div>
      </div>
    </div>
  `;

  const back = document.getElementById("multi-back");
  const createBtn = document.getElementById("btn-create-room");
  const joinBtn = document.getElementById("btn-join-room");

  back?.addEventListener("click", () => {
    renderHomeMenu();
  });

  // 방 만들기 → 방 생성 화면
  createBtn?.addEventListener("click", () => {
    renderCreateRoom();
  });

  // 방 참가하기 → 참가 화면
  joinBtn?.addEventListener("click", () => {
    renderJoinRoom();
  });
}

/* 유니크 초대 코드 (6자리 대문자+숫자 일부) */
function generateInviteCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ===== 방 만들기 화면 (방장) ===== */
function renderCreateRoom() {
  const user = auth.currentUser;
  if (!user) { setMsg("로그인이 필요합니다."); return; }

  let roomRef = null;
  let roomCode = "";
  let unsubRoom = null;
  let unsubPlayers = null;
  const isHost = true;           // 이 화면은 방장
  let currentPlayerCount = 1;    // 현재 인원 (방장 포함)

  contentArea.innerHTML = `

    <div class="room-wrap">
      <div class="room-panel" role="region" aria-label="멀티 플레이">
        <div class="room-header">
          <button id="room-back" class="back-btn" type="button">메뉴</button>
          <h2 class="room-title">멀티 플레이</h2>
        </div>

        <div class="code-row">
          <button id="copy-invite" type="button" class="copy-code-btn" title="초대코드 복사">초대코드</button>
        </div>

        <h3 class="hint" style="text-align:center; opacity:.9; margin-top:10px;">대기실</h3>
        <ul id="players" class="players"></ul>

        <div class="actions">
          <button id="room-start" type="button" class="btn btn-primary" disabled>시작</button>
        </div>

        <p id="room-status" class="hint" aria-live="polite" style="text-align:center;"></p>
      </div>
    </div>
  `;

  const copyBtn = document.getElementById("copy-invite");
  const playersEl = document.getElementById("players");
  const startBtn = document.getElementById("room-start");
  const backBtn = document.getElementById("room-back");
  const statusEl = document.getElementById("room-status");

  // 방 생성 + 본인 등록 + 구독
  (async function init() {
    try {
      const created = await createRoomInFirestore(user);
      roomRef = created.ref;
      roomCode = created.code;
      // 시작 버튼은 인원 스냅샷에서 2명 이상일 때만 활성화
      subscribeRoom();
      subscribePlayers();
    } catch (e) {
      statusEl.textContent = e?.message || "방 생성에 실패했습니다.";
    }
  })();

  // “초대코드” 버튼 클릭 → 초대 코드 복사
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(roomCode); } catch {}
  });

  // 시작(방장만, 최소 2인 이상)
  startBtn.addEventListener("click", async () => {
    if (!roomRef || !isHost) return;

    if (currentPlayerCount < 2) {
      statusEl.textContent = "플레이어가 2명 이상일 때만 시작할 수 있습니다.";
      return;
    }

    try {
      await updateDoc(roomRef, { status: "started", startedAt: serverTimestamp() });

      try { if (unsubRoom) unsubRoom(); } catch {}
      try { if (unsubPlayers) unsubPlayers(); } catch {}

      // 멀티 게임 화면으로 전환
      renderMultiPlay(roomRef, roomCode);
    } catch (e) {
      statusEl.textContent = e?.message || "시작에 실패했습니다.";
    }
  });

  // 메인 메뉴(나가기)
  backBtn.addEventListener("click", async () => {
    await leaveRoom();
    renderMultiEntry();
  });

  function subscribeRoom() {
    if (!roomRef) return;
    unsubRoom = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.status === "started") {
        try { if (unsubRoom) unsubRoom(); } catch {}
        try { if (unsubPlayers) unsubPlayers(); } catch {}
        renderMultiPlay(roomRef, roomCode);
      } else if (data.status === "closed") {
        statusEl.textContent = "방이 종료되었습니다.";
      }
    });
  }

  function subscribePlayers() {
    if (!roomRef) return;
    unsubPlayers = onSnapshot(collection(roomRef, "players"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push(doc.data()));
      list.sort((a,b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0)); // 방장 먼저

      // 현재 인원 수 갱신
      currentPlayerCount = list.length;

      // 인원 수에 따라 시작 버튼 on/off
      if (currentPlayerCount >= 2) {
        startBtn.disabled = false;
        statusEl.textContent = "플레이어가 2명 이상입니다. 시작 버튼을 눌러주세요.";
      } else {
        startBtn.disabled = true;
        statusEl.textContent = "시작하려면 최소 2명이 필요합니다.";
      }

      playersEl.innerHTML = list.map(p => {
        const host = p.isHost ? " (방장)" : "";
        const name = p.name || "플레이어";
        return `<li><span>${name}${host}</span><span class="grow"></span></li>`;
      }).join("");
    });
  }

  async function leaveRoom() {
    try {
      if (unsubRoom) unsubRoom();
      if (unsubPlayers) unsubPlayers();
      if (!roomRef) return;

      // 방장: 대기 중이면 방과 플레이어 목록 정리
      const playersSnap = await getDocs(collection(roomRef, "players"));
      for (const docSnap of playersSnap.docs) {
        await deleteDoc(docSnap.ref);
      }
      await deleteDoc(roomRef);
    } catch (e) {
      console.warn("[leaveRoom]", e);
    }
  }

  async function createRoomInFirestore(user) {
    const MAX_TRY = 5;
    for (let i = 0; i < MAX_TRY; i++) {
      const code = generateInviteCode(6);
      const ref = doc(db, "rooms", code);
      const exists = await getDoc(ref);
      if (exists.exists()) continue;

      await setDoc(ref, {
        code,
        hostUid: user.uid,
        hostName: user.displayName || "플레이어",
        createdAt: serverTimestamp(),
        status: "waiting"
      });

      await setDoc(doc(ref, "players", user.uid), {
        uid: user.uid,
        name: user.displayName || "플레이어",
        photoURL: user.photoURL || "",
        isHost: true,
        joinedAt: serverTimestamp()
      });

      return { ref, code };
    }
    throw new Error("초대 코드를 만들 수 없습니다. 잠시 후 다시 시도하세요.");
  }
}

/* ===== 방 참가 화면 ===== */
function renderJoinRoom() {
  if (!contentArea) return;
  const user = auth.currentUser;
  if (!user) { setMsg("로그인이 필요합니다."); return; }

  contentArea.innerHTML = `

    <div class="join-wrap">
      <div class="join-panel" role="region" aria-label="멀티 플레이 - 방 참가">
        <div class="join-header">
          <button id="join-back" class="back-btn" type="button">메뉴</button>
          <h2 class="join-title">멀티 플레이</h2>
        </div>

        <form id="join-form" class="row">
          <input id="join-code" class="join-input" type="text" maxlength="8" placeholder="초대 코드" autocomplete="off" />
          <button id="join-submit" class="join-btn" type="submit">참가</button>
        </form>

        <p id="join-status" class="hint" aria-live="polite"></p>
      </div>
    </div>
  `;

  const backBtn = document.getElementById("join-back");
  const form = document.getElementById("join-form");
  const codeInput = document.getElementById("join-code");
  const statusEl = document.getElementById("join-status");

  backBtn?.addEventListener("click", () => {
    renderMultiEntry();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = (codeInput.value || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!raw) { statusEl.textContent = "초대 코드를 입력하세요."; codeInput.focus(); return; }
    statusEl.textContent = "참가 중...";
    try {
      const { ref, code } = await joinRoomInFirestore(raw, user);
      renderGuestLobby(ref, code); // 참가자 대기실로 이동
    } catch (err) {
      statusEl.textContent = err?.message || "참가에 실패했습니다. 코드를 확인하세요.";
    }
  });
}

/* Firestore: 방 참가(검증 후 플레이어 등록) */
async function joinRoomInFirestore(code, user) {
  const ref = doc(db, "rooms", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("초대 코드를 찾을 수 없습니다.");
  const data = snap.data() || {};
  if (data.status && data.status !== "waiting") {
    throw new Error("이미 시작되었거나 종료된 방입니다.");
  }
  await setDoc(doc(ref, "players", user.uid), {
    uid: user.uid,
    name: user.displayName || "플레이어",
    photoURL: user.photoURL || "",
    isHost: false,
    joinedAt: serverTimestamp()
  }, { merge: true });

  return { ref, code };
}

/* ===== 참가자 대기실 ===== */
function renderGuestLobby(roomRef, roomCode) {
  if (!contentArea) return;
  const user = auth.currentUser;
  if (!user) { setMsg("로그인이 필요합니다."); return; }

  let unsubRoom = null;
  let unsubPlayers = null;

  contentArea.innerHTML = `

    <div class="room-wrap">
      <div class="room-panel" role="region" aria-label="멀티 플레이 - 대기실(참가자)">
        <div class="room-header">
          <button id="guest-back" class="back-btn" type="button">메뉴</button>
          <h2 class="room-title">멀티 플레이</h2>
        </div>

        <h3 class="hint" style="margin-top:4px;">대기실</h3>
        <ul id="players" class="players"></ul>

        <p id="room-status" class="hint" aria-live="polite"></p>
      </div>
    </div>
  `;

  const backBtn = document.getElementById("guest-back");
  const playersEl = document.getElementById("players");
  const statusEl = document.getElementById("room-status");

  backBtn?.addEventListener("click", async () => {
    await leaveRoomAsGuest();
    renderMultiEntry();
  });

  function subscribeRoom() {
    unsubRoom = onSnapshot(roomRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      if (data.status === "started") {
        try { if (unsubRoom) unsubRoom(); } catch {}
        try { if (unsubPlayers) unsubPlayers(); } catch {}
        // 방장이 시작하면 참가자도 멀티 게임 화면으로 전환
        renderMultiPlay(roomRef, roomCode);
      } else if (data.status === "closed") {
        statusEl.textContent = "방이 종료되었습니다.";
      }
    });
  }

  function subscribePlayers() {
    unsubPlayers = onSnapshot(collection(roomRef, "players"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push(doc.data()));
      list.sort((a,b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
      playersEl.innerHTML = list.map(p => {
        const me = p.uid === user.uid ? " me" : "";
        const host = p.isHost ? " (방장)" : "";
        const name = p.name || "플레이어";
        return `<li><span>${name}${host}</span><span class="grow"></span></li>`;
      }).join("");
    });
  }

  async function leaveRoomAsGuest() {
    try {
      if (unsubRoom) unsubRoom();
      if (unsubPlayers) unsubPlayers();
      await deleteDoc(doc(roomRef, "players", user.uid));
    } catch (e) {
      console.warn("[leaveRoomAsGuest]", e);
    }
  }

  subscribeRoom();
  subscribePlayers();
}

/* ===== 세팅 화면 (상단 중앙 제목, 아래 콘텐츠) ===== */
function openSettings(initialTab = "controls") {
  renderSettings(initialTab);
}

function renderSettings(initialTab = "controls") {
  if (!contentArea) return;
  contentArea.innerHTML = `

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
    testBtn.addEventListener("click", () => { playTestBeep(); });
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
      setMsg("기본값으로 초기화됨", "ok");
      render();
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