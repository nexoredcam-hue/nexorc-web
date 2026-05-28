import { db } from '@vercel/postgres';

export default async function handler(req, res) {
  // Configurar cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
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

  // Inicializar tabla por si acaso
  try {
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
      const key = req.query.key || 'biochakra_count';
      const { rows } = await client.sql`SELECT value FROM kpis WHERE key = ${key};`;
      const value = rows.length > 0 ? rows[0].value : '0';
      return res.status(200).json({ key, value: parseInt(value) });
    }

    if (method === 'POST') {
      const { key, action, value } = req.body;
      const keyTarget = key || 'biochakra_count';

      if (action === 'increment') {
        // Incrementar el contador
        await client.sql`
          INSERT INTO kpis (key, value)
          VALUES (${keyTarget}, '1')
          ON CONFLICT (key)
          DO UPDATE SET value = (COALESCE(NULLIF(kpis.value, '')::integer, 0) + 1)::varchar;
        `;
      } else if (value !== undefined) {
        // Asignar un valor fijo
        await client.sql`
          INSERT INTO kpis (key, value)
          VALUES (${keyTarget}, ${String(value)})
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value;
        `;
      } else {
        return res.status(400).json({ error: 'Acción inválida. Envíe action="increment" o un valor específico.' });
      }

      // Devolver el nuevo valor
      const { rows } = await client.sql`SELECT value FROM kpis WHERE key = ${keyTarget};`;
      const newValue = rows.length > 0 ? rows[0].value : '0';
      return res.status(200).json({ success: true, key: keyTarget, value: parseInt(newValue) });
    }

    return res.status(405).json({ error: `Método ${method} no permitido.` });
  } catch (err) {
    console.error('Error al procesar la petición:', err);
    return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
  }
}
