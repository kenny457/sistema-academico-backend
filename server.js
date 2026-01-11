import bcrypt from "bcrypt";
const saltRounds = 10; 
import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();

// ===== CONFIGURACIÓN CORS - MUY IMPORTANTE =====
// Esto permite que tu frontend en Vercel se conecte al backend
app.use(cors({
  origin: '*',  // Permite todos los orígenes
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Middleware para parsear JSON
app.use(express.json());

// Middleware para logging (ayuda a debuggear)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== RUTA DE PRUEBA =====
app.get("/", (req, res) => {
  res.json({ 
    msg: "API funcionando correctamente",
    timestamp: new Date().toISOString(),
    endpoints: ["/login", "/usuarios", "/materias", "/estudiantes", "/notas"]
  });
});

// =====================
// RUTAS DE USUARIOS
// =====================

app.post("/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    const { cedula, clave } = req.body;
    
    if (!cedula || !clave) {
      return res.status(400).json({ msg: "Cédula y contraseña son requeridas" });
    }

    const query = "SELECT * FROM usuarios WHERE cedula = $1";
    const result = await pool.query(query, [cedula]);

    if (result.rows.length === 0) {
      return res.status(401).json({ msg: "Cédula o contraseña incorrecta" });
    }

    const usuario = result.rows[0];
    const match = await bcrypt.compare(clave, usuario.clave);

    if (!match) {
      return res.status(401).json({ msg: "Cédula o contraseña incorrecta" });
    }

    delete usuario.clave; 
    console.log("Login successful:", usuario.cedula);
    res.json({ msg: "Bienvenido", usuario });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/usuarios", async (req, res) => {
  try {
    const { cedula, nombre, clave } = req.body;
    if (!cedula || !nombre || !clave) {
      return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    const hashedClave = await bcrypt.hash(clave, saltRounds);
    const query = "INSERT INTO usuarios (cedula, nombre, clave) VALUES ($1, $2, $3) RETURNING *";
    const result = await pool.query(query, [cedula, nombre, hashedClave]);
    
    res.json({ msg: "Usuario registrado", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, cedula, nombre FROM usuarios ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, clave } = req.body;

    const hashedClave = await bcrypt.hash(clave, saltRounds);
    const query = "UPDATE usuarios SET cedula=$1, nombre=$2, clave=$3 WHERE id=$4 RETURNING *";
    const result = await pool.query(query, [cedula, nombre, hashedClave, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
    res.json({ msg: "Usuario actualizado", usuario: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ msg: "No encontrado" });
    res.json({ msg: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// RUTAS DE MATERIA
// =====================

app.post("/materias", async (req, res) => {
  try {
    const { nombre_materia } = req.body;
    if (!nombre_materia) {
      return res.status(400).json({ msg: "El nombre de la materia es obligatorio" });
    }
    const query = "INSERT INTO materia (nombre_materia) VALUES ($1) RETURNING *";
    const result = await pool.query(query, [nombre_materia]);
    res.json({ msg: "Materia registrada", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/materias", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM materia ORDER BY id_materia ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/materias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM materia WHERE id_materia = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Materia no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/materias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_materia } = req.body;
    const query = "UPDATE materia SET nombre_materia = $1 WHERE id_materia = $2 RETURNING *";
    const result = await pool.query(query, [nombre_materia, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Materia no encontrada" });
    }
    res.json({ msg: "Materia actualizada", materia: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/materias/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM materia WHERE id_materia = $1", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "Materia no encontrada" });
    }
    res.json({ msg: "Materia eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// RUTAS DE ESTUDIANTES
// =====================

app.get("/estudiantes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM estudiantes ORDER BY nombre ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/estudiantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM estudiantes WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Estudiante no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/estudiantes", async (req, res) => {
  try {
    const { cedula, nombre, correo } = req.body;
    if (!cedula || !nombre) {
      return res.status(400).json({ msg: "Cédula y nombre son obligatorios" });
    }
    const query = "INSERT INTO estudiantes (cedula, nombre, correo) VALUES ($1, $2, $3) RETURNING *";
    const result = await pool.query(query, [cedula, nombre, correo]);
    res.json({ msg: "Estudiante registrado", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/estudiantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, nombre, correo } = req.body;
    
    const query = "UPDATE estudiantes SET cedula=$1, nombre=$2, correo=$3 WHERE id=$4 RETURNING *";
    const result = await pool.query(query, [cedula, nombre, correo, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Estudiante no encontrado" });
    }
    res.json({ msg: "Estudiante actualizado", estudiante: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/estudiantes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM estudiantes WHERE id = $1", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "Estudiante no encontrado" });
    }
    res.json({ msg: "Estudiante eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================
// RUTAS DE NOTAS
// =====================

app.get("/notas", async (req, res) => {
  try {
    const query = `
      SELECT 
        n.id_nota, 
        e.nombre AS nombre_estudiante, 
        m.nombre_materia, 
        n.calificacion 
      FROM notas n
      JOIN estudiantes e ON n.id_estudiante = e.id
      JOIN materia m ON n.id_materia = m.id_materia
      ORDER BY n.id_nota DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/notas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        n.id_nota, 
        e.nombre AS nombre_estudiante, 
        m.nombre_materia, 
        n.calificacion,
        n.id_estudiante,
        n.id_materia
      FROM notas n
      JOIN estudiantes e ON n.id_estudiante = e.id
      JOIN materia m ON n.id_materia = m.id_materia
      WHERE n.id_nota = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Nota no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/notas", async (req, res) => {
  try {
    const { id_estudiante, id_materia, calificacion } = req.body;
    
    if (!id_estudiante || !id_materia || calificacion === undefined) {
      return res.status(400).json({ msg: "Todos los campos son obligatorios" });
    }

    const query = `
      INSERT INTO notas (id_estudiante, id_materia, calificacion) 
      VALUES ($1, $2, $3) RETURNING *
    `;
    const result = await pool.query(query, [id_estudiante, id_materia, calificacion]);
    res.json({ msg: "Nota registrada con éxito", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/notas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { id_estudiante, id_materia, calificacion } = req.body;
    
    const query = `
      UPDATE notas 
      SET id_estudiante=$1, id_materia=$2, calificacion=$3 
      WHERE id_nota=$4 
      RETURNING *
    `;
    const result = await pool.query(query, [id_estudiante, id_materia, calificacion, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "Nota no encontrada" });
    }
    res.json({ msg: "Nota actualizada", nota: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/notas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM notas WHERE id_nota = $1", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "Nota no encontrada" });
    }
    res.json({ msg: "Nota eliminada" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== MANEJO DE RUTAS NO ENCONTRADAS =====
app.use((req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method
  });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`🕐 Iniciado: ${new Date().toISOString()}`);
  console.log(`=================================`);
});




