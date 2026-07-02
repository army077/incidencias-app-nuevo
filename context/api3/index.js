const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3003;

// Configuración de la conexión a la base de datos
const pool = new Pool({
    user: 'army',
    host: 'localhost',
    database: 'artecnologia',
    password: 'hola',
    port: 5432,
});

app.use(express.json());
app.use(cors()); // Habilita CORS para todas las rutas

// Obtener todos los clientes_devoluciones


app.get('/api3/incidencias', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = `
        SELECT
            *
        FROM
            incidencias_rh
    `;
    if (startDate && endDate) {
        query += `
            WHERE marca_temporal >= '${startDate}' AND marca_temporal <= '${endDate}'
        `;
    }

    query += `
        ORDER BY marca_temporal;
    `;

    try {
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

//OBTENER INCIDENCIAS POR ID
app.get('/api3/incidencias/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM incidencias_rh WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incidencia no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la incidencia' });
    }
});
//permisos filtrados 
// GET /api3/permisos_filtrados?area=...&nombre=...
app.get('/api3/permisos_filtrados', async (req, res) => {
    const { area, nombre } = req.query;

    // Validar que vengan los parámetros mínimos
    if (!area || !nombre) {
        return res.status(400).json({ error: "Falta 'area' o 'nombre' en la query" });
    }

    try {
        // Filtramos por:
        //   area = $1
        //   OR jefe_inmediato ILIKE '%valor%'
        const query = `
            SELECT id, fecha_solicitud, nombre_completo, correo, jefe_inmediato,
                   tipo_permiso, urgencia, comentarios, fecha_permiso, status,
                   area, motivo_rechazado
            FROM public.permisos
            WHERE area = $1
               OR jefe_inmediato ILIKE $2
            ORDER BY id DESC
        `;
        const params = [area, `%${nombre}%`];

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al filtrar permisos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


//CREAR INCIDENCIA
app.post('/api3/incidencias', async (req, res) => {
    const { persona_emisor, nombre_emisor, jefe_inmediato, tipo_registro, fecha_permiso, info_registro, status_acta, area } = req.body;
    const marca_temporal = new Date(); // Generar automáticamente la marca temporal
    try {
        const result = await pool.query(
            'INSERT INTO incidencias_rh (marca_temporal, persona_emisor, nombre_emisor, jefe_inmediato, tipo_registro, fecha_permiso, info_registro, status_acta, area) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [marca_temporal, persona_emisor, nombre_emisor, jefe_inmediato, tipo_registro, fecha_permiso, info_registro, status_acta, area]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear incidencia' });
    }
});


//ACTUALIZAR INCIDENCIedit/A
app.patch('/api3/incidencias/:id', async (req, res) => {
    const { id } = req.params;
    console.log("ID recibido:", id); // Verificar el ID recibido en la API
    const { marca_temporal, persona_emisor, nombre_emisor, jefe_inmediato, tipo_registro, fecha_permiso, info_registro, status_acta, area } = req.body;

    try {
        const result = await pool.query(
            `UPDATE incidencias_rh
             SET marca_temporal = $1, persona_emisor = $2, nombre_emisor = $3, jefe_inmediato = $4, tipo_registro = $5, fecha_permiso = $6, info_registro = $7,
                 status_acta = $8, area = $9
             WHERE id = $10 RETURNING *`,
            [marca_temporal, persona_emisor, nombre_emisor, jefe_inmediato, tipo_registro, fecha_permiso, info_registro, status_acta, area, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incidencia no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error en la actualización:", error); // Log para depurar errores
        res.status(500).json({ error: 'Error al actualizar la incidencia' });
    }
});


app.get('/api3/incidencias_fechas', async (req, res) => {
    const { agrupacion, startDate, endDate } = req.query; // Obtiene la agrupación y las fechas de la query string

    let query;
    let queryParams = [];

    // Inicializar el filtro de fechas como una cadena vacía
    let dateFilter = '';

    // Si se proporcionan startDate y endDate, agregamos el filtro de fechas
    if (startDate && endDate) {
        dateFilter = `WHERE marca_temporal >= $1 AND marca_temporal <= $2`;
        queryParams.push(startDate, endDate);
    } else if (startDate) {
        // Si solo se proporciona startDate
        dateFilter = `WHERE marca_temporal >= $1`;
        queryParams.push(startDate);
    } else if (endDate) {
        // Si solo se proporciona endDate
        dateFilter = `WHERE marca_temporal <= $1`;
        queryParams.push(endDate);
    }

    // Definir la consulta SQL según el parámetro de agrupación
    if (agrupacion === 'dia') {
        query = `
            SELECT
                DATE_TRUNC('day', marca_temporal) AS fecha,
                COUNT(*) AS total_incidencias
            FROM
                incidencias_rh
            ${dateFilter}  -- Filtro de fechas si existe
            GROUP BY
                fecha
            ORDER BY
                fecha;
        `;
    } else if (agrupacion === 'semana') {
        query = `
            SELECT
                EXTRACT(WEEK FROM marca_temporal) AS semana,
                COUNT(*) AS total_incidencias
            FROM
                incidencias_rh
            ${dateFilter}
            GROUP BY
                semana
            ORDER BY
                semana;
        `;
    } else if (agrupacion === 'mes') {
        query = `
            SELECT
                TO_CHAR(marca_temporal, 'Month') AS mes,
                COUNT(*) AS total_incidencias
            FROM
                incidencias_rh
            ${dateFilter}
            GROUP BY
                mes, TO_CHAR(marca_temporal, 'MM')
            ORDER BY
                TO_CHAR(marca_temporal, 'MM');
        `;
    } else {
        return res.status(400).json({ error: 'Agrupación no válida' });
    }

    try {
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});




//ELIMINAR UNA INCIDENCIA
app.delete('/api3/incidencias/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM incidencias_rh WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incidencia no encontrada' });
        }
        res.json({ message: 'Incidencia eliminada correctamente', data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la incidencia' });
    }
});

app.post('/api3/incidencias_usuarios', async (req, res) => {
  const { usuario, contraseña, nombre, apellido_paterno, apellido_materno, fila } = req.body;


  try {
      // Verificación de usuario
      const userExists = await pool.query('SELECT * FROM users_incidencias WHERE usuario = $1', [usuario]);

      if (userExists.rows.length > 0) {
          return res.status(400).json({ error: 'El usuario ya existe' });
      }


      // Insertar el nuevo usuario en la base de datos
      const result = await pool.query(
          'INSERT INTO users_incidencias (usuario, contraseña, nombre, apellido_paterno, apellido_materno, fila) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [usuario, contraseña, nombre, apellido_paterno, apellido_materno, fila]
      );

      // Devolver el usuario recién creado
      res.status(201).json(result.rows[0]);
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

app.post('/api3/login', async (req, res) => {
  const { usuario, contraseña } = req.body;

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    if (user.contraseña !== contraseña) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Si las credenciales son correctas, devolver éxito
    res.json({ message: 'Inicio de sesión exitoso', user });
  } catch (error) {
    console.error('Error al verificar el usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Crear un nuevo permiso con fecha automática
app.post('/api3/crear_permiso', async (req, res) => {
    const {
        nombre_completo,
        correo,
        jefe_inmediato,
        tipo_permiso,
        urgencia,
        comentarios,
        status,
        fecha_permiso,
        area,
	correo_lider    
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO permisos (nombre_completo, correo, jefe_inmediato, tipo_permiso, urgencia, comentarios, status, fecha_permiso, area, correo_lider,  fecha_solicitud)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
            [nombre_completo, correo, jefe_inmediato, tipo_permiso, urgencia, comentarios, status, fecha_permiso, area, correo_lider]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener todos los permisos
app.get('/api3/permisos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM permisos');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los permisos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener un permiso por ID
app.get('/api3/permisos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM permisos WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener un permiso por ID
app.get('/api3/permiso_por_correo/:correo', async (req, res) => {
    const { correo } = req.params;

    try {
        const result = await pool.query('SELECT * FROM permisos WHERE correo = $1', [correo]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener un permiso por ID
app.get('/api3/permiso_por_area/:area', async (req, res) => {
    const { area } = req.params;

    try {
        const result = await pool.query('SELECT * FROM permisos WHERE area = $1', [area]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener un permiso por ID
app.get('/api3/permiso_por_status/:status', async (req, res) => {
    const { status } = req.params;

    try {
        const result = await pool.query('SELECT * FROM permisos WHERE status = $1', [status]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener los permisos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar un permiso por ID
app.put('/api3/permisos/:id', async (req, res) => {
    const { id } = req.params;
    const {
        nombre_completo,
        correo,
        jefe_inmediato,
        tipo_permiso,
        urgencia,
        comentarios,
        status,
        fecha_permiso,
        area,
        motivo_rechazado

    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE permisos
             SET nombre_completo = $1, correo = $2, jefe_inmediato = $3, tipo_permiso = $4, urgencia = $5,
                 comentarios = $6, status = $7, fecha_permiso = $8, area = $9, motivo_rechazado = $10
             WHERE id = $11 RETURNING *`,
            [nombre_completo, correo, jefe_inmediato, tipo_permiso, urgencia, comentarios, status, fecha_permiso, area, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar un permiso por ID
app.put('/api3/actualizar_status/:id', async (req, res) => {
    const { id } = req.params;
    const {
        status, motivo_rechazado
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE permisos
             SET status = $1,
             motivo_rechazado = $2
             WHERE id = $3 RETURNING *`,
            [status, motivo_rechazado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// Eliminar un permiso por ID
app.delete('/api3/permisos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM permisos WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Permiso no encontrado' });
        }
        res.status(200).json({ message: 'Permiso eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el permiso:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api3/incidencias_area', async (req, res) => {
    const { startDate, endDate, area } = req.query;

    let query = `
        SELECT *
        FROM incidencias_rh
        WHERE area = $1
    `;
    const params = [area];

    if (startDate && endDate) {
        query += ` AND marca_temporal BETWEEN $2 AND $3`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY marca_temporal`;

    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});


app.get('/api3/incidencias_nombre_emisor', async (req, res) => {
    const { startDate, endDate, nombre_emisor } = req.query;

    let query = `
        SELECT *
        FROM incidencias_rh
        WHERE nombre_emisor = $1
    `;
    const params = [nombre_emisor];

    // Agregar filtro por fechas solo si ambos parámetros están presentes
    if (startDate && endDate) {
        query += ` AND marca_temporal BETWEEN $2 AND $3`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY marca_temporal`;

    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

app.get('/api3/incidencias_fechas_area', async (req, res) => {
  const { agrupacion, startDate, endDate, area } = req.query; // Parámetros de la query string

  let query;
  const queryParams = [];

  // Filtros dinámicos para fechas y área
  let conditions = [];

  // Si se proporciona startDate y endDate
  if (startDate && endDate) {
      conditions.push(`marca_temporal BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`);
      queryParams.push(startDate, endDate);
  } else if (startDate) {
      // Si solo se proporciona startDate
      conditions.push(`marca_temporal >= $${queryParams.length + 1}`);
      queryParams.push(startDate);
  } else if (endDate) {
      // Si solo se proporciona endDate
      conditions.push(`marca_temporal <= $${queryParams.length + 1}`);
      queryParams.push(endDate);
  }

  // Si se proporciona el área, agregar la condición de área
  if (area) {
      conditions.push(`area = $${queryParams.length + 1}`);
      queryParams.push(area);
  }

  // Construir la cláusula WHERE si hay condiciones
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Definir la consulta SQL según la agrupación seleccionada
  if (agrupacion === 'dia') {
      query = `
          SELECT
              DATE_TRUNC('day', marca_temporal) AS fecha,
              COUNT(*) AS total_incidencias
          FROM incidencias_rh
          ${whereClause}
          GROUP BY fecha
          ORDER BY fecha;
      `;
  } else if (agrupacion === 'semana') {
      query = `
          SELECT
              EXTRACT(WEEK FROM marca_temporal) AS semana,
              COUNT(*) AS total_incidencias
          FROM incidencias_rh
          ${whereClause}
          GROUP BY semana
          ORDER BY semana;
      `;
  } else if (agrupacion === 'mes') {
      query = `
          SELECT
              TO_CHAR(marca_temporal, 'Month') AS mes,
              COUNT(*) AS total_incidencias
          FROM incidencias_rh
          ${whereClause}
          GROUP BY mes, TO_CHAR(marca_temporal, 'MM')
          ORDER BY TO_CHAR(marca_temporal, 'MM');
      `;
  } else {
      return res.status(400).json({ error: 'Agrupación no válida' });
  }

  try {
      const result = await pool.query(query, queryParams);
      res.json(result.rows);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error en la base de datos' });
  }
});

// GET /api3/lideres_inmediatos?soloActivos=true&area=Logística&jerarquia=gerente&q=laura
app.get('/api3/lideres_inmediatos', async (req, res) => {
  try {
    const { soloActivos = 'true', area, jerarquia, q } = req.query;

    const where = [];
    const params = [];

    if (soloActivos === 'true') where.push('activo = TRUE');

    if (area) {
      params.push(String(area));
      where.push(`lower(COALESCE(area, '')) = lower($${params.length})`);
    }

    if (jerarquia) {
      params.push(`%${String(jerarquia)}%`);
      where.push(`lower(COALESCE(jerarquia, '')) LIKE lower($${params.length})`);
    }

    if (q) {
      params.push(`%${String(q)}%`);
      const idx = params.length;
      where.push(`(
        lower(nombre) LIKE lower($${idx}) OR
        lower(COALESCE(area,'')) LIKE lower($${idx}) OR
        lower(COALESCE(jerarquia,'')) LIKE lower($${idx}) OR
        lower(COALESCE(correo,'')) LIKE lower($${idx})
      )`);
    }

    const sql = `
      SELECT
        id,
        nombre,
        area,
        activo,
        created_at,
        updated_at,
        lower(correo) AS correo,
        COALESCE(jerarquia, '') AS jerarquia,
	telefono
      FROM public.lideres_incidencias
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY nombre ASC
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Error /api3/lideres_inmediatos:', error);
    res.status(500).json({ error: 'Error al obtener los líderes' });
  }
});


// POST /api3/lideres_incidencias
// POST /api3/lideres_incidencias
app.post('/api3/lideres_incidencias', async (req, res) => {
  try {
    let { nombre, area, activo, correo, jerarquia, telefono } = req.body;

    if (!nombre || !area) {
      return res.status(400).json({ error: 'nombre y area son requeridos' });
    }

    // Default en Node: si no viene activo => true
    if (typeof activo === 'string') {
      activo = activo.trim().toLowerCase() === 'true';
    } else if (typeof activo !== 'boolean') {
      activo = true;
    }

    const result = await pool.query(
      `INSERT INTO public.lideres_incidencias (nombre, area, activo, correo, jerarquia, telefono)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [String(nombre).trim(), String(area).trim(), activo, correo ?? null, jerarquia ?? null, telefono ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear líder:', err);
    res.status(500).json({ error: 'Error al crear líder' });
  }
});

// PUT /api3/lideres_incidencias/:id
// PUT /api3/lideres_incidencias/:id
// PUT /api3/lideres_incidencias/:id
app.put('/api3/lideres_incidencias/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Trae el registro actual
    const currRes = await pool.query(
      'SELECT * FROM public.lideres_incidencias WHERE id = $1',
      [id]
    );
    if (currRes.rows.length === 0) {
      return res.status(404).json({ error: 'Líder no encontrado' });
    }
    const curr = currRes.rows[0];

    let { nombre, area, activo, correo, jerarquia, telefono } = req.body;

    if (typeof nombre !== 'undefined') nombre = String(nombre).trim();
    if (typeof area   !== 'undefined') area   = String(area).trim();

    if (typeof activo === 'string') {
      activo = activo.trim().toLowerCase() === 'true';
    } else if (typeof activo === 'undefined') {
      activo = curr.activo;
    }

    const nuevoNombre  = nombre   ?? curr.nombre;
    const nuevaArea    = area     ?? curr.area;
    const nuevoCorreo  = correo   !== undefined ? correo   : curr.correo;
    const nuevaJerarq  = jerarquia !== undefined ? jerarquia : curr.jerarquia;
    const nuevoTel     = telefono !== undefined ? telefono : curr.telefono;

    if (!nuevoNombre || !nuevaArea) {
      return res.status(400).json({ error: 'nombre y area no pueden ir vacíos' });
    }

    const upd = await pool.query(
      `UPDATE public.lideres_incidencias
         SET nombre = $1, area = $2, activo = $3, correo = $4, jerarquia = $5, telefono = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *;`,
      [nuevoNombre, nuevaArea, activo, nuevoCorreo, nuevaJerarq, nuevoTel, id]
    );

    res.json(upd.rows[0]);
  } catch (err) {
    console.error('Error al actualizar líder:', err);
    res.status(500).json({ error: 'Error al actualizar líder' });
  }
});


// DELETE /api3/lideres_incidencias/:id
app.delete('/api3/lideres_incidencias/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM public.lideres_incidencias WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Líder no encontrado' });
    }

    return res.json({
      message: 'Líder eliminado correctamente',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error al eliminar líder:', err);
    return res.status(500).json({ error: 'Error al eliminar líder' });
  }
});

app.get('/api3/usuarios_permitidos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM public.lideres_incidencias
      WHERE activo = TRUE
        AND correo IS NOT NULL
        AND lower(COALESCE(jerarquia, '')) LIKE '%gerente%'
      ORDER BY correo ASC
    `);
    res.json(rows.map(r => r.correo));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener usuarios permitidos' });
  }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
