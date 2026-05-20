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
  const value = getNestedValue(translations, key)
    || getNestedValue(fallbackTranslations, key)
    || key;

  if (typeof value !== "string") {
    return value;
  }

  return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
    return result.replaceAll(`{${paramKey}}`, String(paramValue));
  }, value);
}

function setTextBySelector(selector, key) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = t(key);
  }
}

function setAriaBySelector(selector, key) {
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute("aria-label", t(key));
  }
}

function applyDirectTranslations() {
  setTextBySelector("#heroBrand h1", "titles.app_title");
  setAriaBySelector("#mobileMenuBtn", "mobile.open_menu");
  setAriaBySelector("#languageMenuBtn", "titles.language");
  setAriaBySelector("#authActionBtn", "auth.login");
  setAriaBySelector("#preferencesLogoutBtn", "auth.logout");
  setTextBySelector("#mobileMenuTitle", "mobile.title");
  setTextBySelector("#mobileMenuDrawer .mobile-menu-heading p", "mobile.subtitle");
  setAriaBySelector("#mobileMenuCloseBtn", "mobile.close_menu");
  setAriaBySelector("#filtersSidebar", "titles.filters");
  setTextBySelector(".activities-panel h2", "search.questions.actividad");
  setTextBySelector("#activitiesGrid .empty-state", "search.loading_activities");
  setTextBySelector(".schedule-panel h2", "search.questions.when");
  setTextBySelector("label[for='horaInicio']", "search.start_time");
  setTextBySelector("label[for='horaFin']", "search.end_time");
  setTextBySelector(".location-panel h2", "search.questions.where");
  setTextBySelector("label[for='locationInput']", "search.location.title");
  setTextBySelector(".range-field > label", "search.location.range");
  setTextBySelector("#btnGeolocalizar", "search.location.my_location");
  setTextBySelector("#btnMapa", "search.location.choose_location");
  setTextBySelector("label[for='cantidadSlider']", "search.quantity_label");
  setAriaBySelector("#cantidadSlider", "search.quantity_aria");
  setTextBySelector("#floatingBuscarBtn", "search.search_beaches");
  setAriaBySelector("#closeMap", "map.close");
  setTextBySelector("#confirmLocation", "map.select_location");
  setAriaBySelector("#closeResultsMap", "map.close_recommendations");
  setTextBySelector("#resultsMapModal h3", "titles.in_map_title");
  setTextBySelector("#resultsMapModal p", "titles.in_map_description");
  setAriaBySelector("#closeLoginModal", "common.close");
  setTextBySelector("label[for='loginEmail']", "auth.email");
  setTextBySelector("label[for='loginPassword']", "auth.password");
  setTextBySelector("label[for='confirmPassword']", "auth.confirm_password");
  setAriaBySelector("#closeFavoritesModal", "common.close");
  setTextBySelector("#favoritesModalTitle", "titles.favorite_beaches");
  setTextBySelector("#favoritesResultsContainer .empty-state", "favorites.loading");

  const authActionLabel = document.getElementById("authActionLabel");
  if (authActionLabel && !document.body.classList.contains("is-authenticated")) {
    authActionLabel.textContent = t("auth.login");
  }

  const loginEmail = document.getElementById("loginEmail");
  if (loginEmail) {
    loginEmail.placeholder = t("placeholders.email");
  }

  const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
  const isRegisterMode = confirmPasswordGroup && confirmPasswordGroup.style.display !== "none";
  const loginModalTitle = document.getElementById("loginModalTitle");
  const authSubmitBtn = document.getElementById("authSubmitBtn");
  const authModeHint = document.getElementById("authModeHint");
  const toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");

  if (loginModalTitle) {
    loginModalTitle.textContent = t(isRegisterMode ? "auth.register" : "auth.login");
  }
  if (authSubmitBtn) {
    authSubmitBtn.textContent = t(isRegisterMode ? "auth.create_account" : "auth.enter");
  }
  if (authModeHint) {
    authModeHint.textContent = t(isRegisterMode ? "auth.already_have_account" : "auth.no_account_question");
  }
  if (toggleAuthModeBtn) {
    toggleAuthModeBtn.textContent = t(isRegisterMode ? "auth.login" : "auth.register");
  }
}

function translatePage() {
  document.title = t("titles.app_title");

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

  applyDirectTranslations();
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
        : navigator.language.startsWith("en")
            ? "en"
            : "es";

    await setLanguage(browserLang);
}
