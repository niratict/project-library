import sql from 'mssql';

const config = {
  user: process.env.GCP_DB_USER,
  password: process.env.GCP_DB_PASSWORD,
  server: process.env.GCP_DB_SERVER,
  port: parseInt(process.env.GCP_DB_PORT, 10),
  database: process.env.GCP_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;
export async function getConnection() {
  if (!pool) pool = await sql.connect(config);
  return pool;
}