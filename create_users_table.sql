-- Use MurukkuDB database
USE MurukkuDB;
GO

-- Create Users Table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        phone NVARCHAR(20),
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        is_active BIT DEFAULT 1
    );
    PRINT '✅ Created users table in MurukkuDB';
END
ELSE
BEGIN
    PRINT 'ℹ️ Users table already exists in MurukkuDB';
END
GO

-- Create index on email for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_users_email' AND object_id = OBJECT_ID('users'))
BEGIN
    CREATE INDEX IX_users_email ON users(email);
    PRINT '✅ Created email index on users table';
END
GO

PRINT '🎉 Users table setup completed in MurukkuDB!';
