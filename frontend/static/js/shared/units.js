import { getCurrentLanguage } from "../languages/i18n.js";

const KMH_TO_MPH = 0.621371;
const KM_TO_MILES = 0.621371;
const CELSIUS_TO_FAHRENHEIT_SCALE = 9 / 5;
const CELSIUS_TO_FAHRENHEIT_OFFSET = 32;

function normalizeNumber(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function roundNumber(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

export function usesImperialWindUnits(lang = getCurrentLanguage()) {
    return lang === "en";
}

export function usesImperialDistanceUnits(lang = getCurrentLanguage()) {
    return lang === "en";
}

export function usesImperialTemperatureUnits(lang = getCurrentLanguage()) {
    return lang === "en";
}

export function getWindSpeedUnit(lang = getCurrentLanguage()) {
    return usesImperialWindUnits(lang) ? "mph" : "km/h";
}

export function getTemperatureUnit(lang = getCurrentLanguage()) {
    return usesImperialTemperatureUnits(lang) ? "\u00B0F" : "\u00B0C";
}

export function getDistanceUnit(lang = getCurrentLanguage()) {
    return usesImperialDistanceUnits(lang) ? "mi" : "km";
}

export function convertWindSpeedForDisplay(value, lang = getCurrentLanguage()) {
    const numericValue = normalizeNumber(value);
    if (numericValue === null) {
        return null;
    }

    return usesImperialWindUnits(lang)
        ? numericValue * KMH_TO_MPH
        : numericValue;
}

export function convertWindSpeedToMetric(value, lang = getCurrentLanguage()) {
    const numericValue = normalizeNumber(value);
    if (numericValue === null) {
        return null;
    }

    return usesImperialWindUnits(lang)
        ? numericValue / KMH_TO_MPH
        : numericValue;
}

export function convertTemperatureForDisplay(value, lang = getCurrentLanguage()) {
    const numericValue = normalizeNumber(value);
    if (numericValue === null) {
        return null;
    }

    return usesImperialTemperatureUnits(lang)
        ? (numericValue * CELSIUS_TO_FAHRENHEIT_SCALE) + CELSIUS_TO_FAHRENHEIT_OFFSET
        : numericValue;
}

export function convertTemperatureToMetric(value, lang = getCurrentLanguage()) {
    const numericValue = normalizeNumber(value);
    if (numericValue === null) {
        return null;
    }

    return usesImperialTemperatureUnits(lang)
        ? (numericValue - CELSIUS_TO_FAHRENHEIT_OFFSET) / CELSIUS_TO_FAHRENHEIT_SCALE
        : numericValue;
}

export function convertDistanceForDisplay(value, lang = getCurrentLanguage()) {
    const numericValue = normalizeNumber(value);
    if (numericValue === null) {
        return null;
    }

    return usesImperialDistanceUnits(lang)
        ? numericValue * KM_TO_MILES
        : numericValue;
}

export function formatWindSpeed(value, { lang = getCurrentLanguage(), decimals = 0 } = {}) {
    const displayValue = convertWindSpeedForDisplay(value, lang);
    if (displayValue === null) {
        return "N/A";
    }

    const roundedValue = roundNumber(displayValue, decimals);
    return decimals > 0 ? roundedValue.toFixed(decimals) : String(roundedValue);
}

export function formatTemperature(value, { lang = getCurrentLanguage(), decimals = 0 } = {}) {
    const displayValue = convertTemperatureForDisplay(value, lang);
    if (displayValue === null) {
        return "N/A";
    }

    const roundedValue = roundNumber(displayValue, decimals);
    return decimals > 0 ? roundedValue.toFixed(decimals) : String(roundedValue);
}

export function formatDistance(value, { lang = getCurrentLanguage(), decimals = 0 } = {}) {
    const displayValue = convertDistanceForDisplay(value, lang);
    if (displayValue === null) {
        return "N/A";
    }

    const roundedValue = roundNumber(displayValue, decimals);
    return decimals > 0 ? roundedValue.toFixed(decimals) : String(roundedValue);
}

export function refreshMeasurementLabels(root = document) {
    root.querySelectorAll('[data-unit-label="wind-speed"]').forEach((element) => {
        element.textContent = getWindSpeedUnit();
    });

    root.querySelectorAll('[data-unit-label="temperature"]').forEach((element) => {
        element.textContent = getTemperatureUnit();
    });

    root.querySelectorAll("[data-distance-km]").forEach((element) => {
        const distanceInKm = element.dataset.distanceKm;
        element.textContent = `${formatDistance(distanceInKm)} ${getDistanceUnit()}`;
    });
}
