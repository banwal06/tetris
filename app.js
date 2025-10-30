import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
getAuth,
onAuthStateChanged,
signInWithEmailAndPassword,
createUserWithEmailAndPassword,
signOut,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 화면 구성: 제목을 패널 내부로 이동
document.body.innerHTML = `

<main class="content" style="gap:1rem;"> <section id="auth-view" aria-live="polite"> <h2 id="panel-title" style="margin:0 0 12px;">로그인</h2>
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
</section> <section id="user-view" hidden> <p><strong id="user-email"></strong>님 로그인됨</p> <button id="logout-btn" type="button">로그아웃</button> </section> </main> `;
const $ = (id) => document.getElementById(id);
const authView = $("auth-view");
const userView = $("user-view");
const userEmailEl = $("user-email");
const msg = $("message");

const loginForm = $("login-form");
const loginEmail = $("login-email");
const loginPassword = $("login-password");

const signupForm = $("signup-form");
const signupEmail = $("signup-email");
const signupPassword = $("signup-password");

const goSignup = $("go-signup");
const goLogin = $("go-login");
const logoutBtn = $("logout-btn");
const toSignupRow = document.getElementById("to-signup");
const panelTitle = document.getElementById("panel-title");

// Helpers
const show = (el) => (el.hidden = false);
const hide = (el) => (el.hidden = true);
const setMsg = (text) => (msg.textContent = text || "");

function ensureHeader() {
let header = document.getElementById("simple-header");
if (!header) {
header = document.createElement("header");
header.id = "simple-header";
header.innerHTML = ` <div class="sh-chip"> <img id="sh-avatar" class="sh-avatar" alt="프로필" /> <span id="sh-name" class="sh-name"></span> <button id="sh-logout" class="sh-logout" type="button">로그아웃</button> </div> `; document.body.appendChild(header); const btn = header.querySelector("#sh-logout"); if (btn) btn.addEventListener("click", async () => { try { await signOut(auth); } catch (err) { setMsg(err.message); } });
}
return header;
}
function removeHeader() {
const el = document.getElementById("simple-header");
if (el) el.remove();
}
function avatarPlaceholder(name) {
const initial = (name && name.trim()[0]) ? name.trim()[0].toUpperCase() : "?" ;
const svg = <svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'> <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'> <stop offset='0' stop-color='#35435a'/><stop offset='1' stop-color='#1f2736'/></linearGradient></defs> <rect width='80' height='80' fill='url(#g)'/> <text x='50%' y='56%' text-anchor='middle' dominant-baseline='middle' font-size='36' fill='#fff' font-family='Segoe UI, Roboto, Arial'>${initial}</text> </svg>;
return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function displayNameOf(user) {
if (!user) return "";
if (user.displayName && user.displayName.trim()) return user.displayName.trim();
if (user.email) return user.email.split("@")[0];
return "사용자";
}
function showHeaderFor(user) {
const header = ensureHeader();
const nameEl = header.querySelector("#sh-name");
const imgEl = header.querySelector("#sh-avatar");
const name = displayNameOf(user);
if (nameEl) nameEl.textContent = name;
if (imgEl) imgEl.src = user.photoURL ? user.photoURL : avatarPlaceholder(name);
}

const topbar = document.createElement("header");
topbar.id = "topbar";
topbar.hidden = true;
topbar.innerHTML = `
  <div class="topbar-inner">
    <div class="topbar-spacer"></div>
    <div id="user-chip" class="user-chip" role="button" aria-haspopup="menu" aria-expanded="false">
      <span id="display-name" class="user-name"></span>
      <img id="avatar" class="avatar" alt="프로필" />
    </div>
    <div id="profile-menu" class="profile-menu" hidden>
      <button id="change-photo-btn" type="button">프로필 이미지 변경</button>
      <button id="logout-menu-btn" type="button">로그아웃</button>
    </div>
    <input id="photo-file" type="file" accept="image/*" hidden />
  </div>
`;
document.body.prepend(topbar);

/* 상단바 요소 */
const userChip = document.getElementById("user-chip");
const profileMenu = document.getElementById("profile-menu");
const changePhotoBtn = document.getElementById("change-photo-btn");
const logoutMenuBtn = document.getElementById("logout-menu-btn");
const photoFile = document.getElementById("photo-file");
const displayNameEl = document.getElementById("display-name");
const avatarEl = document.getElementById("avatar");
if (document.getElementById("profile-menu") && !document.getElementById("change-name-btn")) {
const profileMenu = document.getElementById("profile-menu");
const userChip = document.getElementById("user-chip");
const btn = document.createElement("button");
btn.id = "change-name-btn";
btn.type = "button";
btn.textContent = "이름 변경";
profileMenu.prepend(btn);
btn.addEventListener("click", async () => {
const current =
(auth.currentUser && (auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split("@")[0] : ""))) || "";
const next = window.prompt("새 이름을 입력하세요", current);
if (!next) return;
try {
if (auth.currentUser) {
const { updateProfile } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js");
await updateProfile(auth.currentUser, { displayName: next });
applyUserHeader(auth.currentUser);
setMsg("이름이 변경되었습니다.");
}
} catch (err) {
setMsg(err.message);
} finally {
profileMenu.hidden = true;
userChip && userChip.setAttribute("aria-expanded", "false");
}
});
}

/* 아바타 플레이스홀더 (이니셜) */
function avatarPlaceholder(name) {
  const initial = (name && name.trim()[0]) ? name.trim()[0].toUpperCase() : "?";
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='#35435a'/>
        <stop offset='1' stop-color='#1f2736'/>
      </linearGradient>
    </defs>
    <rect width='100' height='100' fill='url(#g)'/>
    <text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='white' font-family='Segoe UI, Roboto, Arial, sans-serif'>${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* 표시 이름 계산: displayName → 이메일 앞부분 → '사용자' */
function computeDisplayName(user) {
  if (!user) return "";
  if (user.displayName && user.displayName.trim()) return user.displayName.trim();
  if (user.email) return user.email.split('@')[0];
  return "사용자";
}

if (user) {
userEmailEl.textContent = user.email || "";
hide(authView);
// 기존 show(userView); 삭제 또는 주석 처리
const uv = document.getElementById("user-view");
if (uv) uv.remove();
setMsg("");

/* 상단바에 사용자 정보 적용 */
function applyUserHeader(user) {
  if (!user) return;
  const name = computeDisplayName(user);
  if (displayNameEl) displayNameEl.textContent = name;
  const src = user.photoURL ? user.photoURL : avatarPlaceholder(name);
  if (avatarEl) avatarEl.src = src;
}

/* 프로필 메뉴 토글 */
if (userChip) {
  userChip.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = profileMenu.hidden;
    profileMenu.hidden = !isHidden;
    userChip.setAttribute("aria-expanded", String(isHidden));
  });
}
document.addEventListener("click", (e) => {
  if (!profileMenu || profileMenu.hidden) return;
  const withinChip = userChip && userChip.contains(e.target);
  const withinMenu = profileMenu && profileMenu.contains(e.target);
  if (!withinChip && !withinMenu) {
    profileMenu.hidden = true;
    userChip && userChip.setAttribute("aria-expanded", "false");
  }
});

/* 프로필 이미지 변경 (Firebase Storage 없이 Data URL을 photoURL로 저장) */
if (changePhotoBtn && photoFile) {
  changePhotoBtn.addEventListener("click", () => {
    photoFile.value = "";
    photoFile.click();
  });
  photoFile.addEventListener("change", async () => {
    const file = photoFile.files && photoFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      try {
        if (auth.currentUser) {
          // 동적 import로 updateProfile 사용 (상단 import 수정 없이 동작)
          const { updateProfile } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js");
          await updateProfile(auth.currentUser, { photoURL: dataUrl });
          applyUserHeader(auth.currentUser);
          setMsg("프로필 이미지가 변경되었습니다.");
        }
      } catch (err) {
        setMsg(err.message);
      } finally {
        if (profileMenu) profileMenu.hidden = true;
        userChip && userChip.setAttribute("aria-expanded", "false");
      }
    };
    reader.onerror = () => setMsg("이미지를 불러오지 못했습니다.");
    reader.readAsDataURL(file);
  });
}

/* 상단바에서 로그아웃 */
if (logoutMenuBtn) {
  logoutMenuBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setMsg(err.message);
    }
  });
}

// 화면 토글
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
userEmailEl.textContent = user.email || "";
hide(authView);
hide(userView);
if (topbar) { topbar.hidden = false; applyUserHeader(user); }
setMsg("");
} else {
show(authView);
hide(userView);
if (topbar) topbar.hidden = true;
show(loginForm);
hide(signupForm);
if (toSignupRow) toSignupRow.hidden = false;
if (panelTitle) panelTitle.textContent = "로그인";
}
});