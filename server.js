const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ==============================
// POSTGRESQL
// ==============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ==============================
// CREAR TABLA AUTOMÁTICAMENTE
// ==============================
async function iniciarBaseDatos() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mediciones (
        id SERIAL PRIMARY KEY,
        fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        flujo REAL NOT NULL,
        temperatura REAL NOT NULL,
        volumen REAL NOT NULL,
        estado VARCHAR(20) DEFAULT 'ONLINE'
      )
    `);

    console.log("Base de datos lista.");
  } catch (error) {
    console.error("Error en PostgreSQL:", error.message);
  }
}

iniciarBaseDatos();

// ==============================
// ESP32 ENVÍA UNA MEDICIÓN
// ==============================
app.post("/api/mediciones", async (req, res) => {
  try {
    const flujo = Number(req.body.flujo);
    const temperatura = Number(req.body.temperatura);
    const volumen = Number(req.body.volumen);

    if (
      !Number.isFinite(flujo) ||
      !Number.isFinite(temperatura) ||
      !Number.isFinite(volumen)
    ) {
      return res.status(400).json({
        ok: false,
        error: "Datos inválidos",
      });
    }

    const resultado = await pool.query(
      `INSERT INTO mediciones
       (flujo, temperatura, volumen, estado)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [flujo, temperatura, volumen, "ONLINE"]
    );

    res.json({
      ok: true,
      medicion: resultado.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Error guardando la medición",
    });
  }
});

// ==============================
// ÚLTIMA MEDICIÓN
// ==============================
app.get("/api/actual", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT *
      FROM mediciones
      ORDER BY fecha DESC
      LIMIT 1
    `);

    if (resultado.rows.length === 0) {
      return res.json({
        flujo: 0,
        temperatura: 0,
        volumen: 0,
        estado: "SIN DATOS",
        fecha: null,
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo la medición",
    });
  }
});

// ==============================
// HISTORIAL PARA LAS GRÁFICAS
// ==============================
app.get("/api/historial", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT *
      FROM mediciones
      ORDER BY fecha DESC
      LIMIT 100
    `);

    res.json(resultado.rows.reverse());
  } catch (error) {
    res.status(500).json({
      error: "Error obteniendo historial",
    });
  }
});

// ==============================
// COMPROBAR SERVIDOR
// ==============================
app.get("/api/status", (req, res) => {
  res.json({
    sistema: "Sistema IoT Flujo y Temperatura",
    servidor: "ONLINE",
  });
});

// ==============================
// SERVIDOR
// ==============================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor IoT funcionando en puerto ${PORT}`);
});
