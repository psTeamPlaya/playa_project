const PASOS = [
    {
        id: 'tipo_playa',
        titulo: "🏝️ ¿El tipo de suelo es importante para ti?",
        desc: "¿Te importa si la playa es de arena fina, de piedras, o si es una piscina natural?",
        opciones: [
            { texto: "Sí, quiero elegir el tipo", val: true },
            { texto: "No, me da igual el suelo", val: false }
        ]
    },
    {
        id: 'viento',
        titulo: "💨 ¿Buscas playas tranquilas sin mucho viento?",
        desc: "Si sueles huir de las ventoleras, activaremos este filtro.",
        opciones: [
            { texto: "Sí, odio el viento", val: true },
            { texto: "El viento no me molesta", val: false }
        ]
    },
    {
        id: 'oleaje',
        titulo: "🌊 ¿Te gustaría ver la altura de las olas?",
        desc: "Ideal tanto si buscas olas para surfear como si prefieres aguas tranquilas.",
        opciones: [
            { texto: "Sí, enséñame el oleaje", val: true },
            { texto: "No es necesario", val: false }
        ]
    },
    {
        id: 'servicios',
        titulo: "🍹 ¿Sueles buscar playas con servicios?",
        desc: "¿Te interesan filtros para restaurantes, duchas, socorristas, etc.?",
        opciones: [
            { texto: "Sí, quiero ver qué servicios hay", val: true },
            { texto: "Normalmente no los uso", val: false }
        ]
    },
    {
        id: 'actividades',
        titulo: "⚽ ¿Buscas playas para practicar deportes?",
        desc: "¿Quieres ver filtros para zonas deportivas, alquiler de material, etc.?",
        opciones: [
            { texto: "Sí, busco actividades", val: true },
            { texto: "Prefiero relajarme", val: false }
        ]
    },
    {
        id: 'temperatura',
        titulo: "☀️ ¿Te interesa el clima antes de ir?",
        desc: "Temperatura del agua y del ambiente.",
        opciones: [
            { texto: "Sí, quiero asegurar el tiro", val: true },
            { texto: "No me importa mucho", val: false }
        ]
    },
    {
        id: 'nubosidad',
        titulo: "☁️ ¿Te importa si está nublado?",
        desc: "Para los que buscan sol garantizado.",
        opciones: [
            { texto: "Sí, quiero saber si hay sol", val: true },
            { texto: "Las nubes me dan igual", val: false }
        ]
    }
];

let indiceActual = 0;
let respuestas = {};

export function iniciarAsistente(onFinish) {
    const modal = document.getElementById('onboarding-modal');
    const container = document.getElementById('onboarding-step-container');
    const progress = document.getElementById('onboarding-progress');

    if (!modal || !container || !progress) {
        console.error("❌ ERROR: No se encontraron los elementos del onboarding en el HTML.");
        return;
    }

    indiceActual = 0;
    respuestas = {};
    modal.hidden = false;

    modal.scrollTop = 0;

    const render = () => {
        const paso = PASOS[indiceActual];
        progress.innerHTML = `<strong>Pregunta ${indiceActual + 1} de ${PASOS.length}</strong>`;

        container.innerHTML = `
            <h2 class="onboarding-question-title">${paso.titulo}</h2>
            <p class="onboarding-question-desc">${paso.desc}</p>
            <div class="onboarding-options">
                ${paso.opciones.map((opt, i) => `
                    <button class="onboarding-btn" type="button" data-index="${i}">${opt.texto}</button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.onboarding-btn').forEach(btn => {
            btn.onclick = () => {
                const optIndex = btn.dataset.index;
                respuestas[paso.id] = paso.opciones[optIndex].val;

                if (indiceActual < PASOS.length - 1) {
                    indiceActual++;
                    render();
                } else {
                    modal.hidden = true;
                    onFinish(respuestas);
                }
            };
        });
    };

    render();
}