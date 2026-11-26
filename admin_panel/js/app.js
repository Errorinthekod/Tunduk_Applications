// UI logic: login, table rendering, editor dialog, demo controls.
import { api, auth, ApiError } from "./api.js";

const CUSTOM = "__custom__";
const UNKNOWN = "UNKNOWN";

const state = {
  statuses: [],       // [{code, label, needs_explanation, next}]
  applications: [],
  editing: null,      // application being edited, or null when creating
};

const $ = (sel) => document.querySelector(sel);
const el = {
  loginView: $("#login-view"),
  loginForm: $("#login-form"),
  loginToken: $("#login-token"),
  loginError: $("#login-error"),
  panelView: $("#panel-view"),
  totalCount: $("#total-count"),
  failToggle: $("#fail-toggle"),
  failBanner: $("#fail-banner"),
  search: $("#search"),
  statusFilter: $("#status-filter"),
  body: $("#apps-body"),
  empty: $("#table-empty"),
  editor: $("#editor"),
  editorForm: $("#editor-form"),
  editorTitle: $("#editor-title"),
  editorError: $("#editor-error"),
  statusSelect: $("#status-select"),
  customField: $("#custom-status-field"),
  explanationFields: $("#explanation-fields"),
  toast: $("#toast"),
};

// ---------- helpers ----------

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const dateFmt = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

const statusInfo = (code) => state.statuses.find((s) => s.code === code);

let toastTimer;
function toast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle("toast--error", isError);
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.toast.hidden = true), 3000);
}

function handleError(err) {
  if (err instanceof ApiError && err.status === 401) {
    logout("Session expired or token is wrong. Please sign in again.");
    return;
  }
  toast(err.message || "Something went wrong", true);
}

// ---------- views ----------

function showLogin(message = "") {
  el.panelView.hidden = true;
  el.loginView.hidden = false;
  el.loginError.textContent = message;
  el.loginError.hidden = !message;
  el.loginToken.value = "";
  el.loginToken.focus();
}

async function showPanel() {
  el.loginView.hidden = true;
  el.panelView.hidden = false;
  state.statuses = await api.statuses();
  fillStatusOptions();
  await Promise.all([loadApplications(), loadDemoState()]);
}

function logout(message) {
  auth.clear();
  showLogin(message);
}

// ---------- data loading ----------

async function loadApplications() {
  state.applications = await api.listApplications({
    status: el.statusFilter.value,
    q: el.search.value.trim(),
  });
  renderTable();
}

async function loadDemoState() {
  renderDemoState(await api.demoState());
}

function renderDemoState({ fail_mode, total_applications }) {
  el.failToggle.checked = fail_mode;
  el.failBanner.hidden = !fail_mode;
  el.totalCount.textContent = total_applications;
}

// ---------- rendering ----------

function fillStatusOptions() {
  const known = state.statuses.map((s) => `<option value="${s.code}">${escapeHtml(s.label)} (${s.code})</option>`).join("");
  el.statusFilter.innerHTML =
    `<option value="">All statuses</option>${known}<option value="${UNKNOWN}">Unknown code</option>`;
  el.statusSelect.innerHTML = `${known}<option value="${CUSTOM}">Other / custom code…</option>`;
}

function statusBadge(code) {
  const info = statusInfo(code);
  const cls = info ? `status--${code}` : "status--unknown";
  const label = info ? info.label : "Unknown status";
  return `<span class="status ${cls}">
            <span class="status__label">${escapeHtml(label)}</span>
            <span class="status__code">${escapeHtml(code)}</span>
          </span>`;
}

function explanationCell(app) {
  const info = statusInfo(app.status);
  if (!info?.needs_explanation) return `<span class="muted">—</span>`;
  if (!app.explanation_ru && !app.explanation_ky) {
    return `<span class="muted">Not set → citizen sees fallback</span>`;
  }
  return `${escapeHtml(app.explanation_ru ?? "")}
          <span class="cell-sub">${escapeHtml(app.explanation_ky ?? "")}</span>`;
}

function rowHtml(app) {
  const next = statusInfo(app.status)?.next;
  const nextLabel = next ? statusInfo(next)?.label ?? next : null;
  return `
    <tr data-id="${app.id}" class="${app.action_required ? "row--action" : ""}">
      <td class="cell-number">${escapeHtml(app.number)}</td>
      <td>${escapeHtml(app.service_name_ru)}<span class="cell-sub">${escapeHtml(app.service_name_ky)}</span></td>
      <td>${statusBadge(app.status)}</td>
      <td class="cell-explanation">${explanationCell(app)}</td>
      <td>${dateFmt.format(new Date(app.updated_at))}</td>
      <td class="table__actions">
        <button class="btn btn--sm" data-action="advance" ${next ? "" : "disabled"}
                title="${next ? `Move to: ${escapeHtml(nextLabel)}` : "No next step in the demo chain"}">Next →</button>
        <button class="btn btn--sm" data-action="edit">Edit</button>
        <button class="btn btn--sm btn--danger" data-action="delete">Delete</button>
      </td>
    </tr>`;
}

function renderTable() {
  el.body.innerHTML = state.applications.map(rowHtml).join("");
  el.empty.hidden = state.applications.length > 0;
}

// ---------- editor dialog ----------

function updateEditorVisibility() {
  const code = el.statusSelect.value;
  const isCustom = code === CUSTOM;
  el.customField.hidden = !isCustom;
  // Show explanation fields for statuses that use them, and for custom codes.
  el.explanationFields.hidden = !(isCustom || statusInfo(code)?.needs_explanation);
}

function openEditor(app = null) {
  state.editing = app;
  const f = el.editorForm.elements;
  el.editorForm.reset();
  el.editorError.hidden = true;
  el.editorTitle.textContent = app ? `Edit application ${app.number}` : "New application";

  f.number.disabled = !!app;
  f.number.value = app?.number ?? "";
  f.service_name_ru.value = app?.service_name_ru ?? "";
  f.service_name_ky.value = app?.service_name_ky ?? "";
  f.explanation_ru.value = app?.explanation_ru ?? "";
  f.explanation_ky.value = app?.explanation_ky ?? "";

  const code = app?.status ?? "SUBMITTED";
  if (statusInfo(code)) {
    el.statusSelect.value = code;
  } else {
    el.statusSelect.value = CUSTOM;
    f.status_custom.value = code;
  }
  updateEditorVisibility();
  el.editor.showModal();
}

function readEditor() {
  const f = el.editorForm.elements;
  const status = el.statusSelect.value === CUSTOM ? f.status_custom.value.trim().toUpperCase() : el.statusSelect.value;
  if (!status) throw new Error("Enter a custom status code.");

  const withExplanation = !el.explanationFields.hidden;
  const data = {
    service_name_ru: f.service_name_ru.value.trim(),
    service_name_ky: f.service_name_ky.value.trim(),
    status,
    // Statuses without explanations get them cleared.
    explanation_ru: withExplanation ? f.explanation_ru.value : null,
    explanation_ky: withExplanation ? f.explanation_ky.value : null,
  };
  if (!state.editing && f.number.value.trim()) data.number = f.number.value.trim();
  return data;
}

async function saveEditor(event) {
  event.preventDefault();
  const saveBtn = $("#editor-save");
  saveBtn.disabled = true;
  try {
    const data = readEditor();
    if (state.editing) {
      await api.updateApplication(state.editing.id, data);
      toast("Application status updated");
    } else {
      await api.createApplication(data);
      toast("Application created");
    }
    el.editor.close();
    await Promise.all([loadApplications(), loadDemoState()]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return handleError(err);
    el.editorError.textContent = err.message;
    el.editorError.hidden = false;
  } finally {
    saveBtn.disabled = false;
  }
}

// ---------- row actions ----------

async function onRowAction(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.closest("tr").dataset.id);
  const app = state.applications.find((a) => a.id === id);
  if (!app) return;

  try {
    switch (btn.dataset.action) {
      case "edit":
        openEditor(app);
        return;
      case "advance": {
        const updated = await api.advanceApplication(id);
        toast(`${updated.number}: ${statusInfo(updated.status)?.label ?? updated.status}`);
        break;
      }
      case "delete":
        if (!confirm(`Delete application ${app.number}?`)) return;
        await api.deleteApplication(id);
        toast("Application deleted");
        break;
    }
    await Promise.all([loadApplications(), loadDemoState()]);
  } catch (err) {
    handleError(err);
  }
}

// ---------- demo controls ----------

async function onDemoAction(event) {
  const action = event.currentTarget.dataset.demo;
  if (action === "clear" && !confirm("Delete ALL applications?")) return;
  try {
    const s = action === "reset" ? await api.demoReset() : await api.demoClear();
    renderDemoState(s);
    await loadApplications();
    toast(action === "reset" ? "Test data restored" : "All applications deleted");
  } catch (err) {
    handleError(err);
  }
}

async function onFailToggle() {
  try {
    renderDemoState(await api.demoSetFail(el.failToggle.checked));
  } catch (err) {
    el.failToggle.checked = !el.failToggle.checked;
    handleError(err);
  }
}

// ---------- login ----------

async function onLogin(event) {
  event.preventDefault();
  auth.set(el.loginToken.value.trim());
  try {
    await showPanel();
  } catch (err) {
    auth.clear();
    showLogin(err instanceof ApiError && err.status === 401 ? "Wrong token." : err.message);
  }
}

// ---------- wiring ----------

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function init() {
  el.loginForm.addEventListener("submit", onLogin);
  $("#logout-btn").addEventListener("click", () => logout());
  $("#refresh-btn").addEventListener("click", () => Promise.all([loadApplications(), loadDemoState()]).catch(handleError));
  $("#create-btn").addEventListener("click", () => openEditor());
  document.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", onDemoAction));
  el.failToggle.addEventListener("change", onFailToggle);
  el.search.addEventListener("input", debounce(() => loadApplications().catch(handleError), 250));
  el.statusFilter.addEventListener("change", () => loadApplications().catch(handleError));
  el.body.addEventListener("click", onRowAction);
  el.statusSelect.addEventListener("change", updateEditorVisibility);
  el.editorForm.addEventListener("submit", saveEditor);
  $("#editor-cancel").addEventListener("click", () => el.editor.close());

  if (auth.get()) {
    showPanel().catch((err) => {
      auth.clear();
      showLogin(err.message);
    });
  } else {
    showLogin();
  }
}

init();
