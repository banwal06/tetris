import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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

// Helpers
const show = (el) => (el && (el.hidden = false));
const hide = (el) => (el && (el.hidden = true));
const setMsg = (text) => (msg.textContent = text || "");

function fallbackName(user) {
  if (!user) return "";
  if (user.displayName) return user.displayName;
  const email = user.email || "";
  return email.includes("@") ? email.split("@")[0] : email;
}

function svgAvatar(text) {
  const ch = (text || "U").trim().charAt(0).toUpperCase() || "U";
  const bg = "#2be47f";
  const fg = "#0a1a12";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
  <rect width='100%' height='100%' rx='32' ry='32' fill='${bg}'/>
  <text x='50%' y='58%' text-anchor='middle' font-size='36' font-family='Arial, Helvetica, sans-serif' fill='${fg}'>${ch}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
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
  hide(profileMenu);
  profileToggle.setAttribute("aria-expanded", "false");
}
function openMenu() {
  show(profileMenu);
  profileToggle.setAttribute("aria-expanded", "true");
}
profile.addEventListener("click", (e) => {
  if (profileMenu.hidden) openMenu(); else closeMenu();
  e.stopPropagation();
});
document.addEventListener("click", () => closeMenu());
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

// 이름 변경
changeNameBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const current = fallbackName(user);
  const name = prompt("새 이름을 입력하세요", current);
  if (name && name.trim()) {
    try {
      await updateProfile(user, { displayName: name.trim() });
      updateProfileUI(auth.currentUser);
      closeMenu();
    } catch (err) {
      setMsg(err.message);
    }
  }
});

// 프로필 이미지 변경 (파일 선택 → data URL 저장)
changePhotoBtn.addEventListener("click", () => {
  photoInput.click();
});
photoInput.addEventListener("change", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    try {
      await updateProfile(user, { photoURL: dataUrl });
      updateProfileUI(auth.currentUser);
      closeMenu();
      photoInput.value = "";
    } catch (err) {
      setMsg(err.message);
    }
  };
  reader.readAsDataURL(file);
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
