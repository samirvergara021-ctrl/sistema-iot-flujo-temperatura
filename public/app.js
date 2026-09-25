// ==========================================
// SISTEMA IoT - DASHBOARD 3D EN TIEMPO REAL
// ESP32 + PostgreSQL + Render
// ==========================================

const flujoElemento = document.getElementById("flujo");
const temperaturaElemento = document.getElementById("temperatura");
const volumenElemento = document.getElementById("volumen");
const estadoElemento = document.getElementById("estadoSistema");
const conexionElemento = document.getElementById("conexionESP32");
const ultimaActualizacion = document.getElementById("ultimaActualizacion");


// ==========================================
// CONFIGURACIÓN DE LA GRÁFICA 3D
// ==========================================

const configuracionGrafica = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true
};


// ==========================================
// CREAR GRÁFICA 3D VACÍA
// ==========================================

const datosIniciales = [{
    type: "scatter3d",
    mode: "lines+markers",

    x: [],
    y: [],
    z: [],

    name: "Mediciones",

    line: {
        color: "#2563eb",
        width: 6
    },

    marker: {
        size: 4,
        color: [],
        colorscale: "Turbo",
        showscale: true,

        colorbar: {
            title: "Temperatura °C"
        }
    },

    hovertemplate:
        "<b>Medición IoT</b><br>" +
        "Tiempo: %{text}<br>" +
        "Flujo: %{y:.2f} L/min<br>" +
        "Temperatura: %{z:.1f} °C" +
        "<extra></extra>"
}];


const layoutGrafica = {

    margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 20
    },

    paper_bgcolor: "#ffffff",

    scene: {

        bgcolor: "#ffffff",

        xaxis: {
            title: "Tiempo",
            showgrid: true
        },

        yaxis: {
            title: "Flujo (L/min)",
            showgrid: true
        },

        zaxis: {
            title: "Temperatura (°C)",
            showgrid: true
        },

        camera: {
            eye: {
                x: 1.5,
                y: 1.5,
                z: 1.1
            }
        }
    },

    showlegend: false
};


Plotly.newPlot(
    "graficaPrincipal",
    datosIniciales,
    layoutGrafica,
    configuracionGrafica
);


// ==========================================
// CARGAR HISTORIAL DESDE POSTGRESQL
// ==========================================

async function cargarHistorial() {

    try {

        const respuesta = await fetch(
            "/api/historial",
            { cache: "no-store" }
        );

        if (!respuesta.ok) {
            throw new Error("No se pudo cargar el historial");
        }

        const datos = await respuesta.json();


        // Arrays para la gráfica
        const posiciones = [];
        const flujos = [];
        const temperaturas = [];
        const horas = [];


        datos.forEach((medicion, indice) => {

            const fecha = new Date(medicion.fecha);

            const hora = fecha.toLocaleTimeString(
                "es-PA",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );


            // X = secuencia temporal
            posiciones.push(indice + 1);

            // Y = flujo
            flujos.push(
                Number(medicion.flujo) || 0
            );

            // Z = temperatura
            temperaturas.push(
                Number(medicion.temperatura) || 0
            );

            // Texto de hora
            horas.push(hora);

        });


        // Actualizar gráfica 3D
        Plotly.react(
            "graficaPrincipal",

            [{
                type: "scatter3d",
                mode: "lines+markers",

                x: posiciones,
                y: flujos,
                z: temperaturas,

                text: horas,

                name: "Mediciones",

                line: {
                    color: "#2563eb",
                    width: 6
                },

                marker: {
                    size: 4,

                    color: temperaturas,

                    colorscale: "Turbo",

                    showscale: true,

                    colorbar: {
                        title: "Temperatura °C"
                    }
                },

                hovertemplate:
                    "<b>Medición IoT</b><br>" +
                    "Hora: %{text}<br>" +
                    "Flujo: %{y:.2f} L/min<br>" +
                    "Temperatura: %{z:.1f} °C" +
                    "<extra></extra>"
            }],

            layoutGrafica,

            configuracionGrafica
        );


    } catch (error) {

        console.error(
            "Error cargando gráfica:",
            error
        );

    }
}


// ==========================================
// OBTENER LA ÚLTIMA MEDICIÓN
// ==========================================

async function actualizarDashboard() {

    try {

        const respuesta = await fetch(
            "/api/actual",
            { cache: "no-store" }
        );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudo consultar el servidor"
            );

        }


        const datos = await respuesta.json();


        // ==================================
        // FLUJO
        // ==================================

        flujoElemento.textContent =
            Number(datos.flujo || 0).toFixed(2);


        // ==================================
        // TEMPERATURA
        // ==================================

        temperaturaElemento.textContent =
            Number(datos.temperatura || 0).toFixed(1);


        // ==================================
        // VOLUMEN
        // ==================================

        volumenElemento.textContent =
            Number(datos.volumen || 0).toFixed(2);


        // ==================================
        // ESTADO DEL ESP32
        // ==================================

        if (datos.fecha) {

            const fechaMedicion =
                new Date(datos.fecha);


            const tiempoSinDatos =
                Date.now() -
                fechaMedicion.getTime();


            // Menos de 15 segundos
            if (tiempoSinDatos < 15000) {

                conexionElemento.textContent =
                    "ESP32 ONLINE";

                estadoElemento.textContent =
                    "NORMAL";

            }

            else {

                conexionElemento.textContent =
                    "ESP32 OFFLINE";

                estadoElemento.textContent =
                    "SIN SEÑAL";

            }


            ultimaActualizacion.textContent =
                fechaMedicion.toLocaleTimeString(
                    "es-PA"
                );

        }

        else {

            conexionElemento.textContent =
                "ESP32 SIN DATOS";

            estadoElemento.textContent =
                "SIN DATOS";

            ultimaActualizacion.textContent =
                "--:--:--";

        }


    } catch (error) {

        console.error(
            "Error actualizando dashboard:",
            error
        );


        conexionElemento.textContent =
            "SERVIDOR SIN CONEXIÓN";

        estadoElemento.textContent =
            "ERROR";

    }

}


// ==========================================
// ACTUALIZAR TODO
// ==========================================

async function actualizarTodo() {

    await actualizarDashboard();

    await cargarHistorial();

}


// Primera actualización
actualizarTodo();


// ==========================================
// ACTUALIZACIÓN EN TIEMPO REAL
// Cada 1 segundo
// ==========================================

setInterval(
    actualizarTodo,
    1000
);
