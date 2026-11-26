// Tiny i18n engine: dictionaries live in ./locales/*.js, this file only switches and looks up.
import ru from "./locales/ru.js";
import ky from "./locales/ky.js";

const DICTIONARIES = { ru, ky };
const DEFAULT_LANG = "ru";
const STORAGE_KEY = "jobgate.adminLang";

const saved = localStorage.getItem(STORAGE_KEY);
let current = DICTIONARIES[saved] ? saved : DEFAULT_LANG;
const listeners = new Set();

export const getLang = () => current;

/**
 * Locale for Intl date formatting. Kyrgyzstan uses dd.mm.yyyy in both languages,
 * while the ICU "ky-KG" locale gives dd/mm/yy — so RU formatting is used for both.
 */
export const getLocale = () => "ru-RU";

export function onLangChange(fn) {
  listeners.add(fn);
}

export function setLang(lang) {
  if (!DICTIONARIES[lang] || lang === current) return;
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
  listeners.forEach((fn) => fn(lang));
}

const lookup = (dict, key) => key.split(".").reduce((node, part) => node?.[part], dict);

/** t("errors.duplicateNumber", { number: "2026-000101" }) — falls back to RU, then to the key. */
export function t(key, params = {}) {
  const text = lookup(DICTIONARIES[current], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key);
  if (typeof text !== "string") return key;
  return text.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

/** Has a translation for this key (used for status codes: known vs unknown). */
export const has = (key) => typeof lookup(DICTIONARIES[current], key) === "string";

/**
 * Fill static texts in the HTML:
 *   data-i18n="key"              -> textContent
 *   data-i18n-html="key"         -> innerHTML (only our own locale strings, never user data)
 *   data-i18n-placeholder="key"  -> placeholder
 *   data-i18n-title="key"        -> title (tooltip)
 */
export function applyTranslations(root = document) {
  document.documentElement.lang = current;
  document.title = t("app.pageTitle");
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll("[data-i18n-title]").forEach((el) => (el.title = t(el.dataset.i18nTitle)));
  root.querySelectorAll("[data-lang]").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.lang === current)));
}
