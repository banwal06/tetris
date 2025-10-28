"use strict";

const el = {
    form: document.getElementById("new-task-form"),
    input: document.getElementById("new-task-input"),
    list: document.getElementById("task-list"),
    stats: document.querySelector(".stats"),
    filtersWrap: document.querySelector(".filters"),
    filterButtons: document.querySelectorAll(".filter"),
    clearCompleted: document.getElementById("clear-completed"),
};

const STORAGE_KEY = "todo-items-v1";
let tasks = load();
let currentFilter = "all";

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
    return [];
    }
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
        // 저장 실패해도 앱 동작은 계속
    }
}

function addTask(title) {
    const trimmed = String(title || "").trim();
    if (!trimmed) return;
    const t = { id: String(Date.now()), title: trimmed, completed: false };
    tasks.unshift(t);
    save();
    render();
}

function toggleTask(id) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    save();
    render();
}

function removeTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    save();
    render();
}

function clearCompleted() {
    tasks = tasks.filter((t) => !t.completed);
    save();
    render();
}

function getFiltered() {
    if (currentFilter === "active") return tasks.filter((t) => !t.completed);
    if (currentFilter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
}

function escapeHtml(s) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return String(s).replace(/[&<>'"]/g, (c) => map[c]);
}

function render() {
    const items = getFiltered();
    el.list.innerHTML = items
        .map(
        (t) => `
            <li class="task ${t.completed ? "completed" : ""}" data-id="${t.id}">
            <label>
            <input type="checkbox" ${t.completed ? "checked" : ""} />
            <span class="title" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</span>
            </label>
            <button class="remove" title="삭제">삭제</button>
        </li>
        `
    )
    .join("");

    if (el.stats) {
    const left = tasks.filter((t) => !t.completed).length;
    el.stats.textContent = `남은 일 ${left} / 전체 ${tasks.length}`;
    }
}

// Event bindings
if (el.form && el.input) {
    el.form.addEventListener("submit", (e) => {
        e.preventDefault();
        addTask(el.input.value);
        el.input.value = "";
        el.input.focus();
    });
}

if (el.list) {
    el.list.addEventListener("click", (e) => {
        const li = e.target.closest("li.task");
        if (!li) return;
        const id = li.dataset.id;
        if (e.target.matches("input[type=checkbox]")) toggleTask(id);
        if (e.target.matches(".remove")) removeTask(id);
    });
}

if (el.filtersWrap) {
    el.filtersWrap.addEventListener("click", (e) => {
        const btn = e.target.closest(".filter");
        if (!btn) return;
        currentFilter = btn.dataset.filter || "all";
        el.filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
        render();
    });
}

if (el.clearCompleted) {
    el.clearCompleted.addEventListener("click", clearCompleted);
}

// Initial render
render();
