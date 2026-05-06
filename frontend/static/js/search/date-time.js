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
    return `${diaSemana} \u00b7 ${day}/${month}/${year}`;
}

export function obtenerHoraMinimaPermitida() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();

    if (minutos === 0) return hora;
    return hora + 1;
}

export function obtenerHoraTexto(hourNumber) {
    const horaNormalizada = Math.min(hourNumber, 23);
    return `${String(horaNormalizada).padStart(2, "0")}:00`;
}

export function obtenerHorasDisponiblesParaFecha(fechaTexto) {
    const horas = [];
    const hoy = formatearFechaLocal(new Date());
    let horaInicio = 0;

    if (fechaTexto === hoy) horaInicio = obtenerHoraMinimaPermitida();
    for (let hora = horaInicio; hora <= 23; hora++) horas.push(obtenerHoraTexto(hora));
    return horas;
}

export function esFechaHoy(fechaTexto) {
    return fechaTexto === formatearFechaLocal(new Date());
}

export function esHoraPasadaParaFecha(fechaTexto, horaTexto) {
    if (!esFechaHoy(fechaTexto)) {
        return false;
    }
    const horaNumero = Number(horaTexto.split(":")[0]);
    return horaNumero < obtenerHoraMinimaPermitida();
}

export function initDateTime({
    fechaInput,
    fechaShell,
    fechaDisplay,
    hourWheel,
    onScheduleChange
}) {
    let horaSeleccionada = "";
    let hourOptions = [];
    let scrollTimeout;

    function actualizarTextoFecha() {
        if (!fechaDisplay || !fechaInput) return;
        fechaDisplay.textContent = formatearFechaVisual(fechaInput.value);
    }

    function notificarCambio(changed) {
        onScheduleChange?.({
            fecha: fechaInput?.value || "",
            hora: horaSeleccionada,
            changed
        });
    }

    function fijarHoraInicial(valor = "12:00", options = {}) {
        const { silent = false } = options;
        const option = hourWheel?.querySelector(`.hour-option[data-hour="${valor}"]`);

        if (option) {
            option.scrollIntoView({
                block: "center",
                behavior: "auto"
            });
            horaSeleccionada = valor;
            setTimeout(() => actualizarHoraActiva({ silent }), 50);
        }
    }

    function renderizarWheelHoras(fechaTexto, options = {}) {
        const { silent = false } = options;
        const horasDisponibles = obtenerHorasDisponiblesParaFecha(fechaTexto);
        if (!hourWheel) return;

        hourWheel.innerHTML = horasDisponibles
            .map(hora => `<div class="hour-option" data-hour="${hora}">${hora}</div>`)
            .join("");

        hourOptions = [...hourWheel.querySelectorAll(".hour-option")];
        hourOptions.forEach(option => {
            option.addEventListener("click", () => {
                const horaAnterior = horaSeleccionada;
                option.scrollIntoView({
                    block: "center",
                    behavior: "smooth"
                });

                horaSeleccionada = option.dataset.hour || "";
                notificarCambio(horaSeleccionada !== horaAnterior);
                setTimeout(() => actualizarHoraActiva(), 180);
            });
        });

        if (!horasDisponibles.includes(horaSeleccionada)) {
            horaSeleccionada = horasDisponibles[0] || "";
        }
        if (horaSeleccionada) {
            fijarHoraInicial(horaSeleccionada, { silent });
        }
    }

    function actualizarHoraActiva(options = {}) {
        const { silent = false } = options;
        if (!hourWheel || hourOptions.length === 0) return;

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

            if (distancia < 18) option.classList.add("active");
            else if (distancia < 54) option.classList.add("near");
        });

        if (opcionMasCercana) {
            const horaAnterior = horaSeleccionada;
            horaSeleccionada = opcionMasCercana.dataset.hour || "";

            if (!silent) {
                notificarCambio(horaSeleccionada !== horaAnterior);
            }
        }
    }

    function actualizarHorasDisponibles(options = {}) {
        if (!fechaInput) return;
        renderizarWheelHoras(fechaInput.value, options);
    }

    function asegurarHoraValidaSeleccionada(options = {}) {
        const { silent = false } = options;
        if (!fechaInput) return;

        const horasDisponibles = obtenerHorasDisponiblesParaFecha(fechaInput.value);

        if (!horaSeleccionada || !horasDisponibles.includes(horaSeleccionada)) {
            const nuevaHoraValida = horasDisponibles[0] || null;
            if (nuevaHoraValida) {
                fijarHoraInicial(nuevaHoraValida, { silent });
            } else {
                horaSeleccionada = "";
            }
        }
    }

    function esHoraPasadaParaHoy(horaTexto) {
        return esHoraPasadaParaFecha(fechaInput?.value || "", horaTexto);
    }

    function configurarFechaYHoraIniciales(initialSchedule = null) {
        if (!fechaInput) return;

        const hoy = new Date();
        const fechaHoy = formatearFechaLocal(hoy);

        fechaInput.min = fechaHoy;
        fechaInput.value = initialSchedule?.fecha || fechaHoy;
        actualizarTextoFecha();
        actualizarHorasDisponibles({ silent: true });

        if (initialSchedule?.hora && obtenerHorasDisponiblesParaFecha(fechaInput.value).includes(initialSchedule.hora)) {
            fijarHoraInicial(initialSchedule.hora, { silent: true });
            return;
        }

        const horaMinima = obtenerHoraMinimaPermitida();
        if (fechaInput.value === fechaHoy && horaMinima > 23) {
            const manana = new Date();
            manana.setDate(manana.getDate() + 1);
            fechaInput.value = formatearFechaLocal(manana);
            actualizarTextoFecha();
            actualizarHorasDisponibles({ silent: true });
            fijarHoraInicial("00:00", { silent: true });
            return;
        }

        const horaInicial = fechaInput.value === fechaHoy
            ? obtenerHoraTexto(horaMinima)
            : "00:00";

        fijarHoraInicial(horaInicial, { silent: true });
    }

    if (hourWheel) {
        hourWheel.addEventListener("scroll", () => {
            actualizarHoraActiva();

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const activa = hourOptions.find(option => option.classList.contains("active"));

                if (activa) {
                    const horaAnterior = horaSeleccionada;
                    activa.scrollIntoView({
                        block: "center",
                        behavior: "smooth"
                    });
                    horaSeleccionada = activa.dataset.hour || "";
                    notificarCambio(horaSeleccionada !== horaAnterior);
                } else {
                    asegurarHoraValidaSeleccionada({ silent: true });
                }
            }, 120);
        });
    }

    if (fechaShell && fechaInput) {
        fechaShell.addEventListener("click", () => {
            if (typeof fechaInput.showPicker === "function") {
                fechaInput.showPicker();
            } else {
                fechaInput.focus();
                fechaInput.click();
            }
        });
    }

    if (fechaInput) {
        fechaInput.addEventListener("change", () => {
            const hoy = formatearFechaLocal(new Date());

            if (fechaInput.value < hoy) {
                fechaInput.value = hoy;
            }

            actualizarTextoFecha();
            actualizarHorasDisponibles({ silent: true });
            asegurarHoraValidaSeleccionada({ silent: true });
            notificarCambio(true);
        });
    }

    return {
        actualizarTextoFecha,
        renderizarWheelHoras,
        actualizarHoraActiva,
        fijarHoraInicial,
        actualizarHorasDisponibles,
        asegurarHoraValidaSeleccionada,
        configurarFechaYHoraIniciales,
        esFechaHoy,
        esHoraPasadaParaFecha,
        esHoraPasadaParaHoy,
        getFecha: () => fechaInput?.value || "",
        getHoraSeleccionada: () => horaSeleccionada
    };
}
