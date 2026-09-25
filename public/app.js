// ==========================================
// SISTEMA IoT - DASHBOARD EN TIEMPO REAL
// ==========================================

const flujoElemento = document.getElementById("flujo");
const temperaturaElemento = document.getElementById("temperatura");
const volumenElemento = document.getElementById("volumen");
const estadoElemento = document.getElementById("estadoSistema");
const conexionElemento = document.getElementById("conexionESP32");
const ultimaActualizacion = document.getElementById("ultimaActualizacion");


// ==========================================
// GRÁFICA
// ==========================================

const ctx = document.getElementById("graficaPrincipal").getContext("2d");

const grafica = new Chart(ctx, {
    type: "line",

    data: {
        labels: [],

        datasets: [
            {
                label: "Flujo (L/min)",
                data: [],
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.10)",
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                fill: true,
                yAxisID: "y"
            },

            {
                label: "Temperatura (°C)",
                data: [],
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 2,
                fill: false,
                yAxisID: "y1"
            }
        ]
    },

    options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            mode: "index",
            intersect: false
        },

        animation: {
            duration: 400
        },

        plugins: {
            legend: {
                position: "top"
            }
        },

        scales: {
            x: {
                title: {
                    display: true,
                    text: "Tiempo"
                }
            },

            y: {
                type: "linear",
                position: "left",

                title: {
                    display: true,
                    text: "Flujo (L/min)"
                },

                beginAtZero: true
            },

            y1: {
                type: "linear",
                position: "right",

                title: {
                    display: true,
                    text: "Temperatura (°C)"
                },

                grid: {
                    drawOnChartArea: false
                }
            }
        }
    }
});


// ==========================================
// CARGAR HISTORIAL
// ==========================================

async function cargarHistorial() {

    try {

        const respuesta = await fetch("/api/historial");

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener el historial");
        }

        const datos = await respuesta.json();

        grafica.data.labels = [];
        grafica.data.datasets[0].data = [];
        grafica.data.datasets[1].data = [];

        datos.forEach(medicion => {

            const fecha = new Date(medicion.fecha);

            const hora = fecha.toLocaleTimeString("es-PA", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });

            grafica.data.labels.push(hora);

            grafica.data.datasets[0].data.push(
                Number(medicion.flujo)
            );

            grafica.data.datasets[1].data.push(
                Number(medicion.temperatura)
            );
        });

        grafica.update();

    } catch (error) {

        console.error("Error cargando historial:", error);

    }
}


// ==========================================
// OBTENER MEDICIÓN ACTUAL
// ==========================================

async function actualizarDashboard() {

    try {

        const respuesta = await fetch("/api/actual", {
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error("Error consultando el servidor");
        }

        const datos = await respuesta.json();


        // --------------------------
        // VALORES
        // --------------------------

        flujoElemento.textContent =
            Number(datos.flujo || 0).toFixed(2);

        temperaturaElemento.textContent =
            Number(datos.temperatura || 0).toFixed(1);

        volumenElemento.textContent =
            Number(datos.volumen || 0).toFixed(2);


        // --------------------------
        // ESTADO
        // --------------------------

        if (datos.fecha) {

            const fechaMedicion = new Date(datos.fecha);

            const diferencia =
                Date.now() - fechaMedicion.getTime();

            // Si recibió datos hace menos de 15 segundos
            if (diferencia < 15000) {

                estadoElemento.textContent = "NORMAL";
                conexionElemento.textContent = "ESP32 ONLINE";

            } else {

                estadoElemento.textContent = "SIN SEÑAL";
                conexionElemento.textContent = "ESP32 OFFLINE";

            }


            ultimaActualizacion.textContent =
                fechaMedicion.toLocaleTimeString("es-PA");

        } else {

            estadoElemento.textContent = "SIN DATOS";
            conexionElemento.textContent = "ESP32 SIN DATOS";
            ultimaActualizacion.textContent = "--:--:--";

        }


    } catch (error) {

        console.error(error);

        estadoElemento.textContent = "ERROR";
        conexionElemento.textContent = "SERVIDOR SIN CONEXIÓN";

    }
}


// ==========================================
// ACTUALIZACIÓN AUTOMÁTICA
// ==========================================

async function actualizarTodo() {

    await actualizarDashboard();
    await cargarHistorial();

}


// Primera carga
actualizarTodo();


// Actualizar automáticamente cada segundo
setInterval(actualizarTodo, 1000);
