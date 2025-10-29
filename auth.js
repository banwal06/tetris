(() => {
    "use strict";

    const USERS_KEY = "users-v1";
    const SESSION_KEY = "session-v1";

    const $ = (s) => document.querySelector(s);
    const overlay = $("#auth-overlay");
    const frmLogin = $("#auth-login");
    const frmSignup = $("#auth-signup");
    const goSignup = $("#go-signup");
    const goLogin = $("#go-login");
    const switchBack = $("#switch-back");
    const btnGoogle = $("#auth-google");
    const btnApple = $("#auth-apple");
    const btnGuest = $("#auth-guest");
    const errBox = $("#auth-error");

    function loadUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
    }
    function saveUsers(u) {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
    }
    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
    }
    function setSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
    syncOverlay();
    }

    async function sha256(text) {
        try {
        const data = new TextEncoder().encode(text);
        const digest = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
    } catch {
        return text; // fallback (개발용)
        }
    }

    function showError(msg) {
        if (errBox) errBox.textContent = msg || "";
    }

    function syncOverlay() {
    const session = getSession();
    const loggedIn = !!session;
    if (overlay) overlay.style.display = loggedIn ? 'none' : 'flex';
    const tetris = document.getElementById('tetris-section');
    if (tetris) tetris.classList.toggle('hidden', !loggedIn);
}

  // Email/Password
    frmLogin?.addEventListener("submit", async (e) => {
    e.preventDefault(); showError("");
    const email = $("#login-email").value.trim().toLowerCase();
    const pass = $("#login-pass").value;
    const users = loadUsers();
    const user = users.find(u => u.email === email && u.provider === "password");
    if (!user) return showError("가입된 이메일이 없습니다.");
    const ok = user.passHash === await sha256(pass);
    if (!ok) return showError("비밀번호가 올바르지 않습니다.");
    setSession({ uid: user.id, email: user.email, name: user.name || "", provider: "password" });
    });

    frmSignup?.addEventListener("submit", async (e) => {
    e.preventDefault(); showError("");
    const name = $("#signup-name").value.trim();
    const email = $("#signup-email").value.trim().toLowerCase();
    const pass = $("#signup-pass").value;
    if (pass.length < 8) return showError("비밀번호는 8자 이상이어야 합니다.");
    const users = loadUsers();
    if (users.some(u => u.email === email && u.provider === "password")) {
        return showError("이미 가입된 이메일입니다.");
    }
    const user = {
        id: "u_" + Date.now(),
        name, email, provider: "password",
        passHash: await sha256(pass),
    };
    users.push(user); saveUsers(users);
    setSession({ uid: user.id, email: user.email, name: user.name || "", provider: "password" });
    });

    goSignup?.addEventListener("click", () => {
        frmLogin.classList.add("hidden");
        frmSignup.classList.remove("hidden");
        switchBack.classList.remove("hidden");
        showError("");
    });
    goLogin?.addEventListener("click", () => {
    frmSignup.classList.add("hidden");
    switchBack.classList.add("hidden");
    frmLogin.classList.remove("hidden");
    showError("");
    });

  // Social (demo). 실제 연동 시 이 부분을 Firebase/Auth 등으로 교체.
    btnGoogle?.addEventListener("click", () => {
        const email = prompt("Google 이메일을 입력(데모):", "")?.trim().toLowerCase();
        if (!email) return;
        const users = loadUsers();
        let user = users.find(u => u.email === email && u.provider === "google");
        if (!user) {
        user = { id: "g_" + Date.now(), email, provider: "google", name: email.split("@")[0] };
        users.push(user); saveUsers(users);
        } 
        setSession({ uid: user.id, email: user.email, name: user.name || "", provider: "google" });
    });

    btnApple?.addEventListener("click", () => {
        const email = prompt("Apple 이메일을 입력(데모):", "")?.trim().toLowerCase();
        if (!email) return;
        const users = loadUsers();
        let user = users.find(u => u.email === email && u.provider === "apple");
        if (!user) {
        user = { id: "a_" + Date.now(), email, provider: "apple", name: email.split("@")[0] };
        users.push(user); saveUsers(users);
    }
    setSession({ uid: user.id, email: user.email, name: user.name || "", provider: "apple" });
    });

  // Guest
    btnGuest?.addEventListener('click', () => {
        setSession({ uid: 'guest_' + Date.now(), guest: true, name: '게스트', provider: 'guest' });
    });

  // 초기 표시
    syncOverlay();

  // 로그아웃 헬퍼 (원하면 메뉴에 연결하세요)
    window.appSignOut = () => setSession(null);
    })();
