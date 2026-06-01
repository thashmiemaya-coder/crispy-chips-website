const sql = require('mssql');
require('dotenv').config();

const config = {
  user: "Emaya",
  password: "2005",
  server: "DESKTOP-EIBD1L0\\SQLEXPRESS", // Hardcoded from database.js
  database: "MurukkuDB",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

const configEnv = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  }
};

async function test() {
  console.log('Testing hardcoded config from database.js...');
  console.log('Server:', config.server);
  try {
    let pool = await sql.connect(config);
    console.log('✅ Hardcoded config success!');
    await pool.close();
  } catch (err) {
    console.error('❌ Hardcoded config failed:', err.message);
  }

  console.log('\nTesting .env config...');
  console.log('Server:', configEnv.server);
  try {
    let pool = await sql.connect(configEnv);
    console.log('✅ .env config success!');
    await pool.close();
  } catch (err) {
    console.error('❌ .env config failed:', err.message);
  }
}

test();
