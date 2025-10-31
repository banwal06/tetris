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

function renderHomeMenu() {
  if (!contentArea) return;
  contentArea.innerHTML = `
    <style>
      /* 좌측 중앙 배치 */
      .menu-wrap {
        min-height: calc(100vh - 64px); /* 상단바 높이 보정 */
        display: flex;
        align-items: center;   /* 세로 중앙 */
      }
      .game-menu { margin-left: 28px; } /* 좌측 여백 */

      /* 메뉴 링크 스타일(글자 크기/간격 확장, 불릿 제거) */
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

  const status = document.getElementById("menu-status");
  const setStatus = (t) => { if (status) status.textContent = t || ""; };

  const single = document.getElementById("menu-single");
  const multi = document.getElementById("menu-multi");
  const settings = document.getElementById("menu-settings");

  single?.addEventListener("click", (e) => {
    e.preventDefault();
    setStatus("싱글 플레이를 시작합니다 (준비중)");
    console.log("[TETRIS] Start Single Player");
  });
  multi?.addEventListener("click", (e) => {
    e.preventDefault();
    setStatus("멀티 플레이를 준비합니다 (준비중)");
    console.log("[TETRIS] Start Multiplayer");
  });
  settings?.addEventListener("click", (e) => {
    e.preventDefault();
    setStatus("세팅을 엽니다 (준비중)");
    console.log("[TETRIS] Open Settings");
  });
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
