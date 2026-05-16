export function formatearFechaLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function obtenerAbreviaturaDia(fechaTexto) {
    if (!fechaTexto) return "---";

    const [year, month, day] = fechaTexto.split("-").map(Number);
    const fecha = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("es-ES", { weekday: "short" })
        .format(fecha)
        .replace(".", "")
        .toLowerCase();
}

export function formatearFechaVisual(fechaTexto) {
    if (!fechaTexto) return "---";

    const [year, month, day] = fechaTexto.split("-");
    const diaSemana = obtenerAbreviaturaDia(fechaTexto);
    return `${diaSemana} · ${day}/${month}/${year}`;
}

export function obtenerHoraMinimaPermitida() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();

    if (minutos === 0) return hora;
    return hora + 1;
}

export function obtenerHoraTexto(hourNumber) {
    const horaNormalizada = Math.min(Math.max(Number(hourNumber), 0), 23);
    return `${String(horaNormalizada).padStart(2, "0")}:00`;
}

function obtenerHoraNumero(horaTexto) {
    return Number(String(horaTexto || "").split(":")[0]);
}

export function obtenerHorasDisponiblesParaFecha(fechaTexto) {
    const hoy = formatearFechaLocal(new Date());
    const horaMinima = fechaTexto === hoy ? obtenerHoraMinimaPermitida() : 0;
    const horas = [];

    for (let hora = horaMinima; hora <= 22; hora += 1) {
        horas.push(obtenerHoraTexto(hora));
    }
    return horas;
}

export function obtenerHorasFinDisponibles(horaInicioTexto) {
    const horaInicioNumero = obtenerHoraNumero(horaInicioTexto);
    const horas = [];

    for (let hora = horaInicioNumero + 1; hora <= 23; hora += 1) {
        horas.push(obtenerHoraTexto(hora));
    }
    return horas;
}

export function esFechaHoy(fechaTexto) {
    return fechaTexto === formatearFechaLocal(new Date());
}

export function esHoraPasadaParaFecha(fechaTexto, horaTexto) {
    if (!esFechaHoy(fechaTexto)) {
        return false;
    }
    return obtenerHoraNumero(horaTexto) < obtenerHoraMinimaPermitida();
}

export function initDateTime({
    fechaInput,
    fechaShell,
    fechaDisplay,
    horaInicioSelect,
    horaFinSelect,
    onScheduleChange
}) {
    let horaInicioSeleccionada = "";
    let horaFinSeleccionada = "";

    function actualizarTextoFecha() {
        if (!fechaDisplay || !fechaInput) return;
        fechaDisplay.textContent = formatearFechaVisual(fechaInput.value);
    }

    function notificarCambio(changed) {
        onScheduleChange?.({
            fecha: fechaInput?.value || "",
            horaInicio: horaInicioSeleccionada,
            horaFin: horaFinSeleccionada,
            changed
        });
    }

    function renderizarOpciones(select, options, selectedValue) {
        if (!select) return;

        select.innerHTML = options
            .map((hora) => `<option value="${hora}">${hora}</option>`)
            .join("");

        if (options.includes(selectedValue)) {
            select.value = selectedValue;
        }
        else if (options[0]) {
            select.value = options[0];
        }
    }

    function sincronizarHoras(options = {}) {
        const { silent = false } = options;
        const horasInicioDisponibles = obtenerHorasDisponiblesParaFecha(fechaInput?.value || "");

        if (!horasInicioDisponibles.length) {
            horaInicioSeleccionada = "";
            horaFinSeleccionada = "";
            renderizarOpciones(horaInicioSelect, [], "");
            renderizarOpciones(horaFinSelect, [], "");
            if (!silent) {
                notificarCambio(true);
            }
            return;
        }

        if (!horasInicioDisponibles.includes(horaInicioSeleccionada)) {
            horaInicioSeleccionada = horasInicioDisponibles[0];
        }
        renderizarOpciones(horaInicioSelect, horasInicioDisponibles, horaInicioSeleccionada);
        horaInicioSeleccionada = horaInicioSelect?.value || horaInicioSeleccionada;

        const horasFinDisponibles = obtenerHorasFinDisponibles(horaInicioSeleccionada);
        if (!horasFinDisponibles.includes(horaFinSeleccionada)) {
            const horaInicioNumero = obtenerHoraNumero(horaInicioSeleccionada);
            const horaFinPreferida = obtenerHoraTexto(Math.min(horaInicioNumero + 4, 23));
            horaFinSeleccionada = horasFinDisponibles.includes(horaFinPreferida)
                ? horaFinPreferida
                : (horasFinDisponibles[0] || "");
        }
        renderizarOpciones(horaFinSelect, horasFinDisponibles, horaFinSeleccionada);
        horaFinSeleccionada = horaFinSelect?.value || horaFinSeleccionada;

        if (!silent) {
            notificarCambio(true);
        }
    }

    function esHoraPasadaParaHoy(horaTexto) {
        return esHoraPasadaParaFecha(fechaInput?.value || "", horaTexto);
    }

    function configurarFechaYHoraIniciales(initialSchedule = null) {
        if (!fechaInput) return;

        const hoy = new Date();
        const fechaHoy = formatearFechaLocal(hoy);

        const fechaMaxima = new Date();
        fechaMaxima.setDate(fechaMaxima.getDate() + 15);

        fechaInput.min = fechaHoy;
        fechaInput.max = formatearFechaLocal(fechaMaxima);
        fechaInput.value = initialSchedule?.fecha || fechaHoy;

        if (fechaInput.value === fechaHoy && obtenerHoraMinimaPermitida() > 22) {
            const manana = new Date();
            manana.setDate(manana.getDate() + 1);
            fechaInput.value = formatearFechaLocal(manana);
        }

        horaInicioSeleccionada = initialSchedule?.horaInicio || "";
        horaFinSeleccionada = initialSchedule?.horaFin || "";

        actualizarTextoFecha();
        sincronizarHoras({ silent: true });
    }

    if (horaInicioSelect) {
        horaInicioSelect.addEventListener("change", () => {
            const valorAnterior = horaInicioSeleccionada;
            horaInicioSeleccionada = horaInicioSelect.value || "";
            sincronizarHoras({ silent: true });
            notificarCambio(horaInicioSeleccionada !== valorAnterior);
        });
    }

    if (horaFinSelect) {
        horaFinSelect.addEventListener("change", () => {
            const valorAnterior = horaFinSeleccionada;
            horaFinSeleccionada = horaFinSelect.value || "";
            notificarCambio(horaFinSeleccionada !== valorAnterior);
        });
    }

    if (fechaShell && fechaInput) {
        fechaShell.addEventListener("click", () => {
            if (typeof fechaInput.showPicker === "function") {
                fechaInput.showPicker();
            }
            else {
                fechaInput.focus();
                fechaInput.click();
            }
        });
    }

    if (fechaInput) {
        fechaInput.addEventListener("change", () => {
            const hoy = formatearFechaLocal(new Date());
            const fechaMaxima = new Date();
            fechaMaxima.setDate(fechaMaxima.getDate() + 15);
            const fechaMaximaTexto = formatearFechaLocal(fechaMaxima);

            if (fechaInput.value < hoy) {
                fechaInput.value = hoy;
            }
            if (fechaInput.value > fechaMaximaTexto) {
                fechaInput.value = fechaMaximaTexto;
            }
            if (fechaInput.value === hoy && obtenerHoraMinimaPermitida() > 22) {
                const manana = new Date();
                manana.setDate(manana.getDate() + 1);
                fechaInput.value = formatearFechaLocal(manana);
            }

            actualizarTextoFecha();
            sincronizarHoras();
        });
    }

    return {
        actualizarTextoFecha,
        configurarFechaYHoraIniciales,
        esFechaHoy,
        esHoraPasadaParaFecha,
        esHoraPasadaParaHoy,
        getFecha: () => fechaInput?.value || "",
        getHoraInicioSeleccionada: () => horaInicioSeleccionada,
        getHoraFinSeleccionada: () => horaFinSeleccionada,
        getHorarioSeleccionado: () => ({
            fecha: fechaInput?.value || "",
            horaInicio: horaInicioSeleccionada,
            horaFin: horaFinSeleccionada
        })
    };
}
