require('dotenv').config();
const sql = require('mssql');

// SQL Server Authentication Configuration
const masterConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: 'master', // Connect to master first to create the database
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    integratedSecurity: true, // Try Windows Authentication first
    authentication: {
      type: 'ntlm',
      options: {
        domain: '',
        userName: '',
        password: ''
      }
    }
  }
};

// Fallback to SQL Server Authentication
const masterConfigSQL = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: 'master', // Connect to master first to create the database
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  }
};

const murukkuConfig = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: 'MurukkuDB', // Your database name
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    integratedSecurity: true, // Try Windows Authentication first
    authentication: {
      type: 'ntlm',
      options: {
        domain: '',
        userName: '',
        password: ''
      }
    }
  }
};

const murukkuConfigSQL = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT) || 1433,
  database: 'MurukkuDB', // Your database name
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  }
};

async function setupDatabase() {
  let masterPool;
  let murukkuPool;

  try {
    console.log('🔗 Connecting to SQL Server...');
    console.log(`📍 Server: ${process.env.DB_SERVER}:${process.env.DB_PORT || 1433}`);
    
    // Try Windows Authentication first
    try {
      console.log('� Trying Windows Authentication...');
      masterPool = await sql.connect(masterConfig);
      console.log('✅ Connected to master database using Windows Authentication');
    } catch (winAuthError) {
      console.log('❌ Windows Authentication failed, trying SQL Server Authentication...');
      console.log(`👤 User: ${process.env.DB_USER}`);
      masterPool = await sql.connect(masterConfigSQL);
      console.log('✅ Connected to master database using SQL Server Authentication');
    }

    // Step 2: Check if Murukku database exists
    const checkDbQuery = `
      SELECT COUNT(*) as count 
      FROM sys.databases 
      WHERE name = 'MurukkuDB'
    `;
    
    const dbCheckResult = await masterPool.request().query(checkDbQuery);
    
    if (dbCheckResult.recordset[0].count === 0) {
      // Step 3: Create Murukku database if it doesn't exist
      console.log('📦 Creating MurukkuDB database...');
      const createDbQuery = `CREATE DATABASE MurukkuDB`;
      await masterPool.request().query(createDbQuery);
      console.log('✅ MurukkuDB database created successfully');
    } else {
      console.log('ℹ️ MurukkuDB database already exists');
    }

    // Close master connection
    await masterPool.close();

    // Step 4: Connect to Murukku database
    try {
      console.log('🔐 Connecting to MurukkuDB with Windows Authentication...');
      murukkuPool = await sql.connect(murukkuConfig);
      console.log('✅ Connected to MurukkuDB database');
    } catch (winAuthError) {
      console.log('❌ Windows Authentication failed for MurukkuDB, trying SQL Server Authentication...');
      murukkuPool = await sql.connect(murukkuConfigSQL);
      console.log('✅ Connected to MurukkuDB database');
    }

    // Step 5: Check if ContactSubmissions table exists
    const checkTableQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = 'ContactSubmissions'
    `;
    
    const tableCheckResult = await murukkuPool.request().query(checkTableQuery);
    
    if (tableCheckResult.recordset[0].count === 0) {
      // Step 6: Create ContactSubmissions table
      console.log('📋 Creating ContactSubmissions table...');
      const createTableQuery = `
        CREATE TABLE ContactSubmissions (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          Name NVARCHAR(100) NOT NULL,
          Email NVARCHAR(255) NOT NULL,
          Subject NVARCHAR(200) NOT NULL,
          Phone NVARCHAR(20) NULL,
          Message NVARCHAR(1000) NOT NULL,
          CreatedAt DATETIME DEFAULT GETDATE(),
          IsRead BIT DEFAULT 0
        )
      `;
      await murukkuPool.request().query(createTableQuery);
      console.log('✅ ContactSubmissions table created successfully');
    } else {
      console.log('ℹ️ ContactSubmissions table already exists');
    }

    // Step 7: Create indexes for better performance
    console.log('🔍 Creating indexes...');
    
    const indexQueries = [
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ContactSubmissions_CreatedAt' AND object_id = OBJECT_ID('ContactSubmissions'))
        CREATE INDEX IX_ContactSubmissions_CreatedAt ON ContactSubmissions(CreatedAt)`,
      
      `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ContactSubmissions_Email' AND object_id = OBJECT_ID('ContactSubmissions'))
        CREATE INDEX IX_ContactSubmissions_Email ON ContactSubmissions(Email)`
    ];

    for (const query of indexQueries) {
      await murukkuPool.request().query(query);
    }
    
    console.log('✅ Indexes created successfully');

    // Step 8: Create additional tables for the Murukku website
    console.log('📋 Creating additional tables...');

    // Categories table
    const createCategoriesTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Categories')
      CREATE TABLE Categories (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL UNIQUE,
        Description NVARCHAR(500) NULL,
        ImageUrl NVARCHAR(500) NULL,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    await murukkuPool.request().query(createCategoriesTableQuery);
    console.log('✅ Categories table created/verified');

    // Products table
    const createProductsTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Products')
      CREATE TABLE Products (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(2000) NULL,
        Price DECIMAL(10,2) NOT NULL,
        DiscountPrice DECIMAL(10,2) NULL,
        CategoryId INT NOT NULL FOREIGN KEY REFERENCES Categories(Id),
        SKU NVARCHAR(50) NOT NULL UNIQUE,
        StockQuantity INT DEFAULT 0,
        Weight DECIMAL(8,2) NULL,
        Dimensions NVARCHAR(100) NULL,
        ImageUrl NVARCHAR(500) NULL,
        AdditionalImages NVARCHAR(MAX) NULL, -- JSON array of additional image URLs
        IsActive BIT DEFAULT 1,
        IsFeatured BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    await murukkuPool.request().query(createProductsTableQuery);
    console.log('✅ Products table created/verified');

    // Customers table
    const createCustomersTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Customers')
      CREATE TABLE Customers (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(100) NOT NULL,
        LastName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        Phone NVARCHAR(20) NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Address NVARCHAR(500) NULL,
        City NVARCHAR(100) NULL,
        State NVARCHAR(100) NULL,
        PostalCode NVARCHAR(20) NULL,
        Country NVARCHAR(100) NULL,
        IsActive BIT DEFAULT 1,
        EmailVerified BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    await murukkuPool.request().query(createCustomersTableQuery);
    console.log('✅ Customers table created/verified');

    // Orders table
    const createOrdersTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Orders')
      CREATE TABLE Orders (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
        CustomerId INT NOT NULL FOREIGN KEY REFERENCES Customers(Id),
        OrderDate DATETIME DEFAULT GETDATE(),
        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Processing, Shipped, Delivered, Cancelled
        Subtotal DECIMAL(10,2) NOT NULL,
        TaxAmount DECIMAL(10,2) DEFAULT 0,
        ShippingAmount DECIMAL(10,2) DEFAULT 0,
        DiscountAmount DECIMAL(10,2) DEFAULT 0,
        TotalAmount DECIMAL(10,2) NOT NULL,
        PaymentMethod NVARCHAR(50) NULL,
        PaymentStatus NVARCHAR(50) DEFAULT 'Pending', -- Pending, Paid, Failed, Refunded
        ShippingAddress NVARCHAR(500) NULL,
        BillingAddress NVARCHAR(500) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    await murukkuPool.request().query(createOrdersTableQuery);
    console.log('✅ Orders table created/verified');

    // OrderItems table
    const createOrderItemsTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'OrderItems')
      CREATE TABLE OrderItems (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        OrderId INT NOT NULL FOREIGN KEY REFERENCES Orders(Id) ON DELETE CASCADE,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES Products(Id),
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(10,2) NOT NULL,
        DiscountPrice DECIMAL(10,2) NULL,
        TotalPrice DECIMAL(10,2) NOT NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    await murukkuPool.request().query(createOrderItemsTableQuery);
    console.log('✅ OrderItems table created/verified');

    // Wishlist table
    const createWishlistTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Wishlist')
      CREATE TABLE Wishlist (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CustomerId INT NOT NULL FOREIGN KEY REFERENCES Customers(Id) ON DELETE CASCADE,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES Products(Id) ON DELETE CASCADE,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UNIQUE (CustomerId, ProductId) -- Prevent duplicate wishlist items
      )
    `;
    await murukkuPool.request().query(createWishlistTableQuery);
    console.log('✅ Wishlist table created/verified');

    // Cart table
    const createCartTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Cart')
      CREATE TABLE Cart (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        CustomerId INT NOT NULL FOREIGN KEY REFERENCES Customers(Id) ON DELETE CASCADE,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES Products(Id) ON DELETE CASCADE,
        Quantity INT NOT NULL DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        UNIQUE (CustomerId, ProductId) -- Prevent duplicate cart items
      )
    `;
    await murukkuPool.request().query(createCartTableQuery);
    console.log('✅ Cart table created/verified');

    // Reviews table
    const createReviewsTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Reviews')
      CREATE TABLE Reviews (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ProductId INT NOT NULL FOREIGN KEY REFERENCES Products(Id),
        CustomerId INT NOT NULL FOREIGN KEY REFERENCES Customers(Id),
        Rating INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
        Title NVARCHAR(200) NULL,
        Comment NVARCHAR(1000) NULL,
        IsApproved BIT DEFAULT 0,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        UNIQUE (ProductId, CustomerId) -- One review per customer per product
      )
    `;
    await murukkuPool.request().query(createReviewsTableQuery);
    console.log('✅ Reviews table created/verified');

    // Newsletter Subscriptions table
    const createNewsletterTableQuery = `
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'NewsletterSubscriptions')
      CREATE TABLE NewsletterSubscriptions (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Email NVARCHAR(255) NOT NULL UNIQUE,
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `;
    await murukkuPool.request().query(createNewsletterTableQuery);
    console.log('✅ NewsletterSubscriptions table created/verified');

    console.log('🎉 Database setup completed successfully!');
    console.log('📊 Database: MurukkuDB');
    console.log('📋 Tables: ContactSubmissions, Categories, Products, Customers, Orders, OrderItems, Wishlist, Cart, Reviews, NewsletterSubscriptions');
    console.log('🔗 Ready for backend connection');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.number === 18456) {
      console.error('🔐 Authentication failed. Please check your DB_USER and DB_PASSWORD in .env file');
    } else if (error.number === 53) {
      console.error('🌐 Connection failed. Please check DB_SERVER and DB_PORT in .env file');
    }
    
    process.exit(1);
  } finally {
    // Close connections
    if (masterPool && masterPool.connected) {
      await masterPool.close();
    }
    if (murukkuPool && murukkuPool.connected) {
      await murukkuPool.close();
    }
    sql.close();
  }
}

// Run the setup
setupDatabase();
