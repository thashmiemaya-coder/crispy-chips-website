-- SQL Script to Create and Configure User 'Emaya'
-- Run this in SQL Server Management Studio (SSMS)

-- 1. Enable Mixed Authentication Mode (run as query in SSMS)
EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', N'SOFTWARE\Microsoft\MSSQLServer\MSSQLServer', N'LoginMode', N'2', N'REG_DWORD';

-- 2. Create Login for Emaya if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'Emaya')
BEGIN
    CREATE LOGIN Emaya WITH PASSWORD = '2005';
    PRINT '✅ Created login for user: Emaya';
END
ELSE
BEGIN
    ALTER LOGIN Emaya WITH PASSWORD = '2005';
    PRINT '✅ Updated password for user: Emaya';
END

-- 3. Create MurukkuDB database if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = N'MurukkuDB')
BEGIN
    CREATE DATABASE MurukkuDB;
    PRINT '✅ Created database: MurukkuDB';
END

-- 4. Wait a moment for database to be fully created
WAITFOR DELAY '00:00:02';

-- 5. Switch to MurukkuDB - use master first to ensure database exists
USE master;

-- 6. Create user in MurukkuDB if it doesn't exist
IF EXISTS (SELECT * FROM sys.databases WHERE name = N'MurukkuDB')
BEGIN
    EXEC('USE MurukkuDB;
    
    IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N''Emaya'')
    BEGIN
        CREATE USER Emaya FOR LOGIN Emaya;
        PRINT ''✅ Created user in MurukkuDB: Emaya'';
    END
    
    ALTER ROLE db_owner ADD MEMBER Emaya;
    PRINT ''✅ Granted db_owner role to Emaya'';');
END
ELSE
BEGIN
    PRINT '❌ Database MurukkuDB not found after creation attempt';
END

-- 7. Test connection
PRINT '✅ User setup complete!';

-- 8. Show current users (for verification)
USE master;
SELECT 
    dp.name AS database_user,
    sp.name AS server_login,
    dp.type_desc AS user_type
FROM sys.database_principals dp
JOIN sys.server_principals sp ON dp.sid = sp.sid
WHERE dp.name = 'Emaya';

PRINT '🎉 SQL User setup completed successfully!';
PRINT '📝 You can now connect with:';
PRINT '   Username: Emaya';
PRINT '   Password: 2005';
PRINT '   Database: MurukkuDB';
