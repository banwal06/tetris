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
const CLOUDINARY_CLOUD_NAME = "dkl4wukal"; // 예: mycloud
const CLOUDINARY_UPLOAD_PRESET = "profile image";   // 프리셋 이름(Unsigned)
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
