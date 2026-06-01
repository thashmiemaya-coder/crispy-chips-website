-- Create SQL Server user 'Emaya' with password '2005'
-- Run this script in SQL Server Management Studio (SSMS)

-- First, check if the login already exists
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'Emaya')
BEGIN
    -- Create the SQL Server login
    CREATE LOGIN Emaya 
    WITH PASSWORD = '2005',
    DEFAULT_DATABASE = master;
    
    PRINT 'SQL Server login Emaya created successfully';
END
ELSE
BEGIN
    PRINT 'SQL Server login Emaya already exists';
END

-- Grant necessary permissions
-- Grant server-level permissions
GRANT VIEW SERVER STATE TO Emaya;
GRANT VIEW ANY DATABASE TO Emaya;

-- Grant access to the MurukkuDB database (if it exists)
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'MurukkuDB')
BEGIN
    USE MurukkuDB;
    
    -- Create user in the database if it doesn't exist
    IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = N'Emaya')
    BEGIN
        CREATE USER Emaya FOR LOGIN Emaya;
        PRINT 'Database user Emaya created in MurukkuDB';
    END
    
    -- Grant db_owner permissions (for development - adjust for production)
    ALTER ROLE db_owner ADD MEMBER Emaya;
    PRINT 'Granted db_owner permissions to Emaya in MurukkuDB';
END
ELSE
BEGIN
    PRINT 'MurukkuDB database does not exist yet - it will be created by the setup script';
END

PRINT 'Setup completed successfully';
