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
show(userView);
setMsg("");
} else {
show(authView);
hide(userView);
show(loginForm);
hide(signupForm);
if (toSignupRow) toSignupRow.hidden = false;
if (panelTitle) panelTitle.textContent = "로그인";
}
});