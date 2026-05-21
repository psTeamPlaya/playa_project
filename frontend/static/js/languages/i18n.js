let translations = {};
let fallbackTranslations = {};
let currentLang = "es";


async function loadFallbackTranslations() {
    const response = await fetch("/static/locales/es.json");
    fallbackTranslations = await response.json();
}

export async function setLanguage(lang) {
    currentLang = lang;

    const response = await fetch(`/static/locales/${lang}.json`);
    translations = await response.json();

    translatePage();

    const select = document.getElementById("languageSelect");

    if (select) {
        select.value = lang;
    }

    localStorage.setItem("lang", lang);
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, part) => {
    return acc?.[part];
  }, obj);
}

export function t(key, params = {}) {
  let value =
    getNestedValue(translations, key) ||
    getNestedValue(fallbackTranslations, key) ||
    key;

  // simple interpolation ({{var}} for parameters)
  Object.entries(params).forEach(([k, v]) => {
    value = value.replaceAll(`{{${k}}}`, v);
  });

  return value;
}

function translatePage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;

    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.dataset.i18nPlaceholder;

    el.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
}

export async function initLanguage() {
    await loadFallbackTranslations();

    const saved = localStorage.getItem("lang");

    if (saved) {
        await setLanguage(saved);
        return;
    }

    const browserLang = navigator.language.startsWith("cs")
        ? "cs"
        : navigator.language.startsWith("de")
            ? "de"
        : navigator.language.startsWith("en")
            ? "en"
            : "es";

    await setLanguage(browserLang);
}
