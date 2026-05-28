import { db } from '@vercel/postgres';

export default async function handler(req, res) {
  // Configurar cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let client;
  try {
    client = await db.connect();
  } catch (err) {
    console.error('Error de conexión a la base de datos Vercel Postgres:', err);
    return res.status(500).json({ error: 'No se pudo conectar a la base de datos', details: err.message });
  }

  // Inicializar tablas si no existen
  try {
    await client.sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id_ticket VARCHAR(50) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        telefono VARCHAR(50) NOT NULL,
        rut VARCHAR(50),
        email VARCHAR(255),
        urgencia VARCHAR(100),
        estado_proceso VARCHAR(100) DEFAULT 'Recibido',
        hardware JSONB,
        sintomas TEXT,
        bitacora JSONB
      );
    `;
    await client.sql`
      CREATE TABLE IF NOT EXISTS kpis (
        key VARCHAR(50) PRIMARY KEY,
        value VARCHAR(255)
      );
    `;
  } catch (err) {
    console.error('Error inicializando tablas:', err);
  }

  const { method } = req;

  try {
    if (method === 'GET') {
      const { rows } = await client.sql`SELECT * FROM tickets ORDER BY id_ticket DESC;`;
      return res.status(200).json(rows);
    }

    if (method === 'POST') {
      const { id_ticket, nombre, telefono, rut, email, urgencia, estado_proceso, hardware, sintomas, bitacora } = req.body;

      if (!id_ticket || !nombre || !telefono) {
        return res.status(400).json({ error: 'id_ticket, nombre y telefono son campos requeridos.' });
      }

      await client.sql`
        INSERT INTO tickets (id_ticket, nombre, telefono, rut, email, urgencia, estado_proceso, hardware, sintomas, bitacora)
        VALUES (
          ${id_ticket}, 
          ${nombre}, 
          ${telefono}, 
          ${rut || null}, 
          ${email || null}, 
          ${urgencia || 'Generico'}, 
          ${estado_proceso || 'Recibido'}, 
          ${JSON.stringify(hardware || {})}, 
          ${sintomas || ''}, 
          ${JSON.stringify(bitacora || [])}
        )
        ON CONFLICT (id_ticket)
        DO UPDATE SET
          nombre = EXCLUDED.nombre,
          telefono = EXCLUDED.telefono,
          rut = EXCLUDED.rut,
          email = EXCLUDED.email,
          urgencia = EXCLUDED.urgencia,
          estado_proceso = EXCLUDED.estado_proceso,
          hardware = EXCLUDED.hardware,
          sintomas = EXCLUDED.sintomas,
          bitacora = EXCLUDED.bitacora;
      `;
      return res.status(200).json({ success: true, message: `Ticket ${id_ticket} guardado correctamente.` });
    }

    if (method === 'DELETE') {
      const id_ticket = req.query.id_ticket || req.body.id_ticket;
      if (!id_ticket) {
        return res.status(400).json({ error: 'id_ticket es requerido para eliminar.' });
      }

      await client.sql`DELETE FROM tickets WHERE id_ticket = ${id_ticket};`;
      return res.status(200).json({ success: true, message: `Ticket ${id_ticket} eliminado correctamente.` });
    }

    return res.status(405).json({ error: `Método ${method} no permitido.` });
  } catch (err) {
    console.error('Error al procesar la petición:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
}
