const activityCards = document.querySelectorAll(".activity-card");
const fechaInput = document.getElementById("fecha");
const buscarBtn = document.getElementById("buscarBtn");
const limpiarBtn = document.getElementById("limpiarBtn");
const statusEl = document.getElementById("status");
const resultsContainer = document.getElementById("resultsContainer");
const hourWheel = document.getElementById("hourWheel");
const hourOptions = document.querySelectorAll(".hour-option");
let horaSeleccionada = "12:00";
let actividadSeleccionada = "";

// Fecha y hora por defecto para que coincida con datos fake
fechaInput.value = "2026-04-06";
fijarHoraInicial("12:00");

activityCards.forEach(card => {
  card.addEventListener("click", () => {
    activityCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    actividadSeleccionada = card.dataset.activity;
  });
});

limpiarBtn.addEventListener("click", () => {
  activityCards.forEach(c => c.classList.remove("selected"));
  actividadSeleccionada = "";
  fechaInput.value = "2026-04-06";
  fijarHoraInicial("12:00");
  statusEl.textContent = "";
  resultsContainer.innerHTML = `
    <div class="empty-state">
      Aquí aparecerán las recomendaciones cuando realices una búsqueda.
    </div>
  `;
});

buscarBtn.addEventListener("click", async () => {
  const fecha = fechaInput.value;
  const hora = horaSeleccionada;

  if (!actividadSeleccionada) {
    statusEl.textContent = "Debes seleccionar una actividad.";
    return;
  }
  if (!fecha) {
    statusEl.textContent = "Debes seleccionar una fecha.";
    return;
  }
  if (!hora) {
    statusEl.textContent = "Debes seleccionar una hora.";
    return;
  }
  statusEl.textContent = "Buscando recomendaciones...";

  try {
    const response = await fetch(`/recomendaciones?actividad=${actividadSeleccionada}&fecha=${fecha}&hora=${hora}`);
    if (!response.ok) {
      throw new Error("No se pudieron obtener las recomendaciones.");
    }

    const data = await response.json();
    pintarResultados(data.resultados);
    statusEl.textContent = `Se han encontrado ${data.resultados.length} recomendaciones para ${actividadSeleccionada.replace("_", " ")}.`;
  } 
  catch (error) {
    console.error(error);
    statusEl.textContent = "Ha ocurrido un error al consultar la API.";
    resultsContainer.innerHTML = `
      <div class="empty-state">
        No se pudieron cargar los resultados.
      </div>
    `;
  }
});

function actualizarHoraActiva() {
  const wheelRect = hourWheel.getBoundingClientRect();
  const wheelCenter = wheelRect.top + wheelRect.height / 2;

  let opcionMasCercana = null;
  let distanciaMinima = Infinity;

  hourOptions.forEach(option => {
    const rect = option.getBoundingClientRect();
    const optionCenter = rect.top + rect.height / 2;
    const distancia = Math.abs(wheelCenter - optionCenter);

    option.classList.remove("active", "near");

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      opcionMasCercana = option;
    }
  });

  hourOptions.forEach(option => {
    const rect = option.getBoundingClientRect();
    const optionCenter = rect.top + rect.height / 2;
    const distancia = Math.abs(wheelCenter - optionCenter);

    if (distancia < 18) {
      option.classList.add("active");
    } else if (distancia < 54) {
      option.classList.add("near");
    }
  });

  if (opcionMasCercana) {
    horaSeleccionada = opcionMasCercana.dataset.hour;
  }
}

let scrollTimeout;
hourWheel.addEventListener("scroll", () => {
  actualizarHoraActiva();

  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const activa = [...hourOptions].find(option => option.classList.contains("active"));
    if (activa) {
      activa.scrollIntoView({
        block: "center",
        behavior: "smooth"
      });
      horaSeleccionada = activa.dataset.hour;
    }
  }, 120);
});

hourOptions.forEach(option => {
  option.addEventListener("click", () => {
    option.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
    horaSeleccionada = option.dataset.hour;
    setTimeout(actualizarHoraActiva, 180);
  });
});

function fijarHoraInicial(valor = "12:00") {
  const option = document.querySelector(`.hour-option[data-hour="${valor}"]`);
  if (option) {
    option.scrollIntoView({
      block: "center",
      behavior: "auto"
    });
    horaSeleccionada = valor;
    setTimeout(actualizarHoraActiva, 50);
  }
}


function pintarResultados(resultados) {
  if (!resultados || resultados.length === 0) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
      No hay resultados para esa búsqueda.
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = resultados.map((playa, index) => {
  const servicios = formatearServicios(playa.servicios);
  const condiciones = playa.condiciones;

  return `
    <details class="beach-card desplegable">
      <summary class="beach-summary">
        <div class="beach-summary-left">
          <div class="ranking-badge">#${index + 1}</div>
          <div>
            <h3 class="beach-title">${playa.nombre}</h3>
            <div class="beach-location">${playa.ubicacion}</div>
            <div class="beach-short-motivo"></div>
          </div>
        </div>

        <div class="beach-summary-right">
          <div class="score-badge">Score: ${Number(playa.score).toFixed(1)}</div>
          <div class="expand-hint">Ver detalle</div>
          </div>
      </summary>

      <div class="beach-detail">
        <p class="beach-desc">${playa.descripcion}</p>

        <div class="meta-list">
          <span class="chip">🏖️ Tipo: ${playa.tipo}</span>
          <span class="chip">🌡️ Temp. aire: ${condiciones.temperatura_ambiente} ºC</span>
          <span class="chip">🌊 Oleaje: ${condiciones.altura_oleaje} m</span>
          <span class="chip">💨 Viento: ${condiciones.velocidad_viento} km/h</span>
          <span class="chip">🌡️ Agua: ${condiciones.temperatura_agua} ºC</span>
          <span class="chip">🌤️ Nubosidad: ${condiciones.nubosidad}%</span>
          <span class="chip">🌧️ Lluvia: ${condiciones.probabilidad_lluvia}%</span>
          <span class="chip">🌙 Marea: ${condiciones.marea}</span>
        </div>

        <div class="motivo detalle-box">
          <strong>Explicación de la recomendación:</strong> ${playa.motivo}
        </div>

        <div class="services-list">${servicios}</div>
      </div>
    </details>
      `;
  }).join("");
}


function formatearServicios(servicios) {
  const iconos = {
    restaurantes: "🍽️ Restaurantes",
    comida_para_llevar: "🥡 Comida para llevar",
    balneario: "🚿 Balneario",
    zona_deportiva: "🏐 Zona deportiva"
  };
  return Object.entries(servicios)
    .filter(([_, disponible]) => disponible)
    .map(([clave]) => `<span class="chip">${iconos[clave] || clave}</span>`)
    .join("");
}