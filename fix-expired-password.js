const sql = require('mssql');

const config = {
  server: "DESKTOP-EIBD1L0\\SQLEXPRESS",
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
        integratedSecurity: true
    }
  }
};

async function fix() {
  console.log('Connecting using Windows Authentication...');
  try {
    let pool = await sql.connect(config);
    console.log('✅ Connected!');
    
    const query = "ALTER LOGIN Emaya WITH PASSWORD = '2005', CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;";
    await pool.request().query(query);
    console.log('✅ SQL Login Emaya has been updated (password reset and expiration disabled).');
    
    await pool.close();
  } catch (err) {
    console.error('❌ Failed:', err.message);
    if (err.message.includes('Integrated Security')) {
        console.log('Try another way...');
    }
  }
}

fix();
