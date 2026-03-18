const activitySelect = document.getElementById('activity');
const form = document.getElementById('recommendation-form');
const resultsContainer = document.getElementById('results');
const geoBtn = document.getElementById('geo-btn');
const latInput = document.getElementById('latitude');
const lonInput = document.getElementById('longitude');
const statusPanel = document.getElementById('status-panel');
const statusMessage = document.getElementById('status-message');
const dateInput = document.getElementById('selected-date');

function showStatus(message, isError = false) {
  statusPanel.classList.remove('hidden');
  statusMessage.textContent = message;
  statusMessage.className = isError ? 'status-error' : 'status-ok';
}

function clearStatus() {
  statusPanel.classList.add('hidden');
  statusMessage.textContent = '';
  statusMessage.className = '';
}

function resultCard(result) {
  const fallback = result.dynamic_conditions.used_fallback
    ? '<p class="small">Proveedor externo no disponible o sin cobertura horaria. Se usaron valores de respaldo.</p>'
    : '<p class="small">Datos dinámicos obtenidos del proveedor externo.</p>';

  return `
    <article class="card">
      <div class="card-header">
        <div>
          <div class="rank">#${result.rank} · ${result.beach_name}</div>
          <h2>${result.beach_name}</h2>
          <p class="small">${result.municipality}</p>
        </div>
        <div class="score">${result.score.toFixed(1)}</div>
      </div>

      <div class="meta">
        <span class="pill">Distancia: ${result.distance_km.toFixed(1)} km</span>
        <span class="pill">Superficie: ${result.static_features.surface_type}</span>
        <span class="pill">Acceso: ${result.static_features.access_type}</span>
        <span class="pill">Comida cerca: ${result.static_features.food_nearby ? 'sí' : 'no'}</span>
      </div>

      <div class="conditions">
        <span class="pill">Aire: ${formatValue(result.dynamic_conditions.air_temp_c, '°C')}</span>
        <span class="pill">Agua: ${formatValue(result.dynamic_conditions.water_temp_c, '°C')}</span>
        <span class="pill">Oleaje: ${formatValue(result.dynamic_conditions.wave_height_m, 'm')}</span>
        <span class="pill">Viento: ${formatValue(result.dynamic_conditions.wind_kmh, 'km/h')}</span>
        <span class="pill">Lluvia: ${formatValue(result.dynamic_conditions.rain_probability_pct, '%')}</span>
        <span class="pill">Nubosidad: ${formatValue(result.dynamic_conditions.cloud_cover_pct, '%')}</span>
      </div>

      <div class="explanations">
        ${result.explanation.map(reason => `<span class="pill">${reason}</span>`).join('')}
      </div>

      ${fallback}
    </article>
  `;
}

function formatValue(value, suffix) {
  return value === null || value === undefined ? 'N/D' : `${Number(value).toFixed(1)} ${suffix}`;
}

async function loadActivities() {
  const response = await fetch('/api/v1/activities');
  const activities = await response.json();
  activitySelect.innerHTML = activities.map(activity => `
    <option value="${activity.code}">${activity.label}</option>
  `).join('');
}

geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showStatus('Tu navegador no soporta geolocalización.', true);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      latInput.value = coords.latitude.toFixed(6);
      lonInput.value = coords.longitude.toFixed(6);
      showStatus('Ubicación cargada correctamente.');
    },
    () => showStatus('No se pudo obtener tu ubicación. Introduce latitud y longitud manualmente.', true),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();
  resultsContainer.innerHTML = '<section class="panel">Calculando recomendación...</section>';

  const payload = {
    activity: activitySelect.value,
    selected_date: dateInput.value,
    selected_hour: Number(document.getElementById('selected-hour').value),
    user_location: {
      latitude: Number(latInput.value),
      longitude: Number(lonInput.value),
    },
    max_distance_km: Number(document.getElementById('max-distance').value),
  };

  try {
    const response = await fetch('/api/v1/recommendations/top', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('La API devolvió un error al calcular las recomendaciones.');
    }

    const data = await response.json();
    resultsContainer.innerHTML = '';

    if (data.explanation_if_empty) {
      showStatus(data.explanation_if_empty, data.results.length === 0);
    } else {
      showStatus(`Top-${data.results.length} calculado correctamente.`);
    }

    if (!data.results.length) {
      resultsContainer.innerHTML = '<section class="panel">No hay playas válidas para la consulta actual.</section>';
      return;
    }

    resultsContainer.innerHTML = data.results.map(resultCard).join('');
  } catch (error) {
    resultsContainer.innerHTML = '';
    showStatus(error.message || 'Ha ocurrido un error inesperado.', true);
  }
});

function setDefaultDate() {
  const today = new Date();
  dateInput.value = today.toISOString().slice(0, 10);
}

setDefaultDate();
loadActivities().catch(() => showStatus('No se pudieron cargar las actividades.', true));
