const sql = require('mssql');

// Database configurations to test
const configs = [
  {
    name: "Direct Instance Name",
    config: {
      user: "Emaya",
      password: "2005",
      server: "DESKTOP-EIBD1L0\\SQLEXPRESS06",
      database: "MurukkuDB",
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    }
  },
  {
    name: "Separate Server + Instance",
    config: {
      user: "Emaya",
      password: "2005",
      server: "DESKTOP-EIBD1L0",
      database: "MurukkuDB",
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS06'
      }
    }
  },
  {
    name: "Default Port 1433",
    config: {
      user: "Emaya",
      password: "2005",
      server: "DESKTOP-EIBD1L0\\SQLEXPRESS06",
      database: "MurukkuDB",
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    }
  },
  {
    name: "Port 1434 (Common Express)",
    config: {
      user: "Emaya",
      password: "2005",
      server: "DESKTOP-EIBD1L0\\SQLEXPRESS06",
      database: "MurukkuDB",
      port: 1434,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    }
  },
  {
    name: "Localhost Instance",
    config: {
      user: "Emaya",
      password: "2005",
      server: "localhost\\SQLEXPRESS06",
      database: "MurukkuDB",
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    }
  },
  {
    name: "Localhost Default Port",
    config: {
      user: "Emaya",
      password: "2005",
      server: "localhost",
      database: "MurukkuDB",
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    }
  }
];

async function testConnection(config, configName) {
  console.log(`\n🔍 Testing: ${configName}`);
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);
  console.log(`Port: ${config.port || 'default'}`);
  
  try {
    const pool = await sql.connect(config);
    console.log(`✅ Connection successful!`);
    
    // Test a simple query
    const request = pool.request();
    const result = await request.query('SELECT @@VERSION as version, GETDATE() as current_datetime');
    
    console.log(`📊 Database version: ${result.recordset[0].version.split('\n')[0]}`);
    console.log(`⏰ Current time: ${result.recordset[0].current_time}`);
    
    // Test if MurukkuDB exists and has tables
    try {
      const tableResult = await request.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        ORDER BY TABLE_NAME
      `);
      
      console.log(`📋 Found ${tableResult.recordset.length} tables:`);
      tableResult.recordset.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.TABLE_NAME}`);
      });
    } catch (tableError) {
      console.log(`⚠️  Could not list tables: ${tableError.message}`);
    }
    
    await pool.close();
    return { success: true, message: 'Connection successful' };
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    return { success: false, message: error.message };
  }
}

async function checkAllConnections() {
  console.log('🚀 Starting Database Connectivity Check');
  console.log('=====================================');
  
  let successfulConfig = null;
  
  for (const { name, config } of configs) {
    const result = await testConnection(config, name);
    
    if (result.success) {
      successfulConfig = { name, config };
      console.log(`\n🎉 SUCCESS! Found working configuration: ${name}`);
      break;
    }
    
    // Add delay between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!successfulConfig) {
    console.log('\n❌ No working configuration found!');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure SQL Server Express is running');
    console.log('2. Check SQL Server Configuration Manager for port settings');
    console.log('3. Enable TCP/IP in SQL Server Network Configuration');
    console.log('4. Start SQL Server Browser service');
    console.log('5. Check Windows Firewall settings');
    console.log('6. Verify SQL Server authentication mode (Mixed Mode)');
  } else {
    console.log('\n✅ Recommended configuration for database.js:');
    console.log('const config = {');
    console.log(`  user: "${successfulConfig.config.user}",`);
    console.log(`  password: "${successfulConfig.config.password}",`);
    console.log(`  server: "${successfulConfig.config.server}",`);
    console.log(`  database: "${successfulConfig.config.database}",`);
    if (successfulConfig.config.port) {
      console.log(`  port: ${successfulConfig.config.port},`);
    }
    console.log('  options: {');
    console.log('    encrypt: false,');
    console.log('    trustServerCertificate: true,');
    console.log('    enableArithAbort: true');
    if (successfulConfig.config.options.instanceName) {
      console.log(`    instanceName: '${successfulConfig.config.options.instanceName}'`);
    }
    console.log('  }');
    console.log('};');
  }
  
  console.log('\n🏁 Database Connectivity Check Complete');
}

// Run the check
checkAllConnections().catch(console.error);
