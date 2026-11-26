// UI logic: login, table rendering, editor dialog, demo controls.
// All visible text goes through t() — see js/i18n.js and js/locales/.
import { api, auth, ApiError } from "./api.js";
import { applyTranslations, getLocale, has, onLangChange, setLang, t } from "./i18n.js";

const CUSTOM = "__custom__";
const UNKNOWN = "UNKNOWN";

const state = {
  statuses: [],       // [{code, needs_explanation, next}] from the backend
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

const formatDate = (iso) =>
  new Intl.DateTimeFormat(getLocale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

const statusInfo = (code) => state.statuses.find((s) => s.code === code);

/** Translated status title; unknown codes get a generic label. */
const statusLabel = (code) => (has(`statuses.${code}`) ? t(`statuses.${code}`) : t("statuses.unknown"));

/** Turn any error into a message in the current language. */
function errorMessage(err, context) {
  if (!(err instanceof ApiError)) return err.message || t("errors.generic");
  switch (err.status) {
    case 0: return t("errors.network");
    case 401: return t("errors.wrongToken");
    case 404: return t("errors.notFound");
    case 409: return context === "create" ? t("errors.duplicateNumber") : t("errors.noNextStatus");
    case 422: return t("errors.validation");
    default: return err.status >= 500 ? t("errors.server", { status: err.status }) : t("errors.generic");
  }
}

let toastTimer;
function toast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle("toast--error", isError);
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.toast.hidden = true), 3000);
}

function handleError(err, context) {
  if (err instanceof ApiError && err.status === 401) {
    logout(t("errors.sessionExpired"));
    return;
  }
  toast(errorMessage(err, context), true);
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
  state.statuses = await api.statuses();
  el.loginView.hidden = true;
  el.panelView.hidden = false;
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

const reloadAll = () => Promise.all([loadApplications(), loadDemoState()]);

function renderDemoState({ fail_mode, total_applications }) {
  el.failToggle.checked = fail_mode;
  el.failBanner.hidden = !fail_mode;
  el.totalCount.textContent = total_applications;
}

// ---------- rendering ----------

function fillStatusOptions() {
  const keepFilter = el.statusFilter.value;
  const keepStatus = el.statusSelect.value;
  const known = state.statuses
    .map((s) => `<option value="${s.code}">${escapeHtml(statusLabel(s.code))} (${s.code})</option>`)
    .join("");

  el.statusFilter.innerHTML =
    `<option value="">${escapeHtml(t("toolbar.allStatuses"))}</option>${known}` +
    `<option value="${UNKNOWN}">${escapeHtml(t("toolbar.unknownCode"))}</option>`;
  el.statusSelect.innerHTML = `${known}<option value="${CUSTOM}">${escapeHtml(t("editor.customOption"))}</option>`;

  el.statusFilter.value = keepFilter;
  if (keepStatus) el.statusSelect.value = keepStatus;
}

function statusBadge(code) {
  const cls = statusInfo(code) ? `status--${code}` : "status--unknown";
  return `<span class="status ${cls}">
            <span class="status__label">${escapeHtml(statusLabel(code))}</span>
            <span class="status__code">${escapeHtml(code)}</span>
          </span>`;
}

function explanationCell(app) {
  const info = statusInfo(app.status);
  if (!info?.needs_explanation) return `<span class="muted">—</span>`;
  if (!app.explanation_ru && !app.explanation_ky) {
    return `<span class="muted">${escapeHtml(t("table.noExplanation"))}</span>`;
  }
  return `<span lang="ru">${escapeHtml(app.explanation_ru ?? "")}</span>
          <span class="cell-sub" lang="ky">${escapeHtml(app.explanation_ky ?? "")}</span>`;
}

function rowHtml(app) {
  const next = statusInfo(app.status)?.next;
  const nextTitle = next ? t("actions.nextHint", { label: statusLabel(next) }) : t("actions.noNext");
  return `
    <tr data-id="${app.id}" class="${app.action_required ? "row--action" : ""}">
      <td class="cell-number">${escapeHtml(app.number)}</td>
      <td><span lang="ru">${escapeHtml(app.service_name_ru)}</span>
          <span class="cell-sub" lang="ky">${escapeHtml(app.service_name_ky)}</span></td>
      <td>${statusBadge(app.status)}</td>
      <td class="cell-explanation">${explanationCell(app)}</td>
      <td>${formatDate(app.updated_at)}</td>
      <td class="table__actions">
        <button class="btn btn--sm" data-action="advance" ${next ? "" : "disabled"}
                title="${escapeHtml(nextTitle)}">${escapeHtml(t("actions.next"))}</button>
        <button class="btn btn--sm" data-action="edit">${escapeHtml(t("actions.edit"))}</button>
        <button class="btn btn--sm btn--danger" data-action="delete">${escapeHtml(t("actions.delete"))}</button>
      </td>
    </tr>`;
}

function renderTable() {
  el.body.innerHTML = state.applications.map(rowHtml).join("");
  el.empty.hidden = state.applications.length > 0;
}

// ---------- editor dialog ----------

function updateEditorTitle() {
  el.editorTitle.textContent = state.editing
    ? t("editor.editTitle", { number: state.editing.number })
    : t("editor.newTitle");
}

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
  updateEditorTitle();

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
  if (!status) throw new Error(t("errors.customRequired"));

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
  const context = state.editing ? "update" : "create";
  saveBtn.disabled = true;
  try {
    const data = readEditor();
    if (state.editing) {
      const statusChanged = data.status !== state.editing.status;
      await api.updateApplication(state.editing.id, data);
      toast(statusChanged ? t("toast.statusUpdated") : t("toast.saved"));
    } else {
      await api.createApplication(data);
      toast(t("toast.created"));
    }
    el.editor.close();
    await reloadAll();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return handleError(err);
    el.editorError.textContent = errorMessage(err, context);
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
        toast(t("toast.advanced", { number: updated.number, label: statusLabel(updated.status) }));
        break;
      }
      case "delete":
        if (!confirm(t("confirm.delete", { number: app.number }))) return;
        await api.deleteApplication(id);
        toast(t("toast.deleted"));
        break;
    }
    await reloadAll();
  } catch (err) {
    handleError(err, btn.dataset.action);
  }
}

// ---------- demo controls ----------

async function onDemoAction(event) {
  const action = event.currentTarget.dataset.demo;
  if (action === "clear" && !confirm(t("confirm.clear"))) return;
  try {
    const s = action === "reset" ? await api.demoReset() : await api.demoClear();
    renderDemoState(s);
    await loadApplications();
    toast(action === "reset" ? t("toast.restored") : t("toast.cleared"));
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
    showLogin(errorMessage(err));
  }
}

// ---------- language ----------

/** Re-render everything built in JS (static HTML is handled by applyTranslations). */
function onLanguageChanged() {
  if (state.statuses.length) {
    fillStatusOptions();
    renderTable();
  }
  if (el.editor.open) updateEditorTitle();
  if (!el.loginError.hidden) el.loginError.hidden = true; // old message is in the previous language
}

// ---------- wiring ----------

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function init() {
  applyTranslations();
  onLangChange(onLanguageChanged);
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  el.loginForm.addEventListener("submit", onLogin);
  $("#logout-btn").addEventListener("click", () => logout());
  $("#refresh-btn").addEventListener("click", () => reloadAll().catch((e) => handleError(e)));
  $("#create-btn").addEventListener("click", () => openEditor());
  document.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", onDemoAction));
  el.failToggle.addEventListener("change", onFailToggle);
  el.search.addEventListener("input", debounce(() => loadApplications().catch((e) => handleError(e)), 250));
  el.statusFilter.addEventListener("change", () => loadApplications().catch((e) => handleError(e)));
  el.body.addEventListener("click", onRowAction);
  el.statusSelect.addEventListener("change", updateEditorVisibility);
  el.editorForm.addEventListener("submit", saveEditor);
  $("#editor-cancel").addEventListener("click", () => el.editor.close());

  if (auth.get()) {
    showPanel().catch((err) => {
      auth.clear();
      showLogin(errorMessage(err));
    });
  } else {
    showLogin();
  }
}

init();
