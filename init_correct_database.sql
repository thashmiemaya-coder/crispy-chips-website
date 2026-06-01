USE MurukkuDB;
GO

-- 1. Drop existing tables if they exist to start fresh
IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL DROP TABLE dbo.order_items;
IF OBJECT_ID('dbo.payments', 'U') IS NOT NULL DROP TABLE dbo.payments;
IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL DROP TABLE dbo.orders;
IF OBJECT_ID('dbo.user_addresses', 'U') IS NOT NULL DROP TABLE dbo.user_addresses;
IF OBJECT_ID('dbo.Wishlist', 'U') IS NOT NULL DROP TABLE dbo.Wishlist;
IF OBJECT_ID('dbo.Cart', 'U') IS NOT NULL DROP TABLE dbo.Cart;
IF OBJECT_ID('dbo.Reviews', 'U') IS NOT NULL DROP TABLE dbo.Reviews;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
IF OBJECT_ID('dbo.ContactSubmissions', 'U') IS NOT NULL DROP TABLE dbo.ContactSubmissions;
IF OBJECT_ID('dbo.NewsletterSubscriptions', 'U') IS NOT NULL DROP TABLE dbo.NewsletterSubscriptions;

IF OBJECT_ID('dbo.products', 'U') IS NOT NULL DROP TABLE dbo.products;
IF OBJECT_ID('dbo.wishlist', 'U') IS NOT NULL DROP TABLE dbo.wishlist;

GO

-- 2. Create correct snake_case users table
CREATE TABLE dbo.users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    phone NVARCHAR(20),
    user_type NVARCHAR(20) DEFAULT 'customer',
    is_wholesale_approved BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1
);
GO

-- 3. Create correct user_addresses table
CREATE TABLE dbo.user_addresses (
    address_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES dbo.users(user_id),
    recipient_name NVARCHAR(100) NOT NULL,
    phone_number NVARCHAR(20) NOT NULL,
    region_city_district NVARCHAR(200) NOT NULL,
    address NVARCHAR(500) NOT NULL,
    postal_code NVARCHAR(20),
    is_default BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- 4. Create correct PascalCase Categories table (needed by server.js GET /api/categories)
CREATE TABLE dbo.Categories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(500) NULL,
    ImageUrl NVARCHAR(500) NULL,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 5. Create correct PascalCase Products table (needed by server.js GET /api/products)
CREATE TABLE dbo.Products (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(2000) NULL,
    Price DECIMAL(10,2) NOT NULL,
    DiscountPrice DECIMAL(10,2) NULL,
    CategoryId INT NOT NULL FOREIGN KEY REFERENCES dbo.Categories(Id),
    SKU NVARCHAR(50) NOT NULL UNIQUE,
    StockQuantity INT DEFAULT 0,
    Weight DECIMAL(8,2) NULL,
    Dimensions NVARCHAR(100) NULL,
    ImageUrl NVARCHAR(500) NULL,
    AdditionalImages NVARCHAR(MAX) NULL,
    IsActive BIT DEFAULT 1,
    IsFeatured BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 6. Create correct snake_case orders table
CREATE TABLE dbo.orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL FOREIGN KEY REFERENCES dbo.users(user_id),
    order_number NVARCHAR(50) NOT NULL UNIQUE,
    status NVARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address_id INT NULL FOREIGN KEY REFERENCES dbo.user_addresses(address_id),
    recipient_name NVARCHAR(100) NULL,
    phone_number NVARCHAR(20) NULL,
    region_city_district NVARCHAR(200) NULL,
    shipping_address NVARCHAR(500) NULL,
    postal_code NVARCHAR(20) NULL,
    payment_method NVARCHAR(50),
    payment_status NVARCHAR(50) DEFAULT 'pending',
    transaction_id NVARCHAR(100) NULL,
    order_type NVARCHAR(50) DEFAULT 'regular',
    order_notes NVARCHAR(1000) NULL,
    estimated_delivery DATETIME NULL,
    actual_delivery DATETIME NULL,
    order_date DATETIME DEFAULT GETDATE(),
    confirmed_date DATETIME NULL,
    shipped_date DATETIME NULL,
    delivered_date DATETIME NULL,
    collection_date DATETIME NULL,
    updated_at DATETIME DEFAULT GETDATE()
);
GO

-- 7. Create correct snake_case order_items table
CREATE TABLE dbo.order_items (
    order_item_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL FOREIGN KEY REFERENCES dbo.orders(order_id) ON DELETE CASCADE,
    product_id INT NOT NULL FOREIGN KEY REFERENCES dbo.Products(Id),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
GO

-- 8. Create correct snake_case payments table
CREATE TABLE dbo.payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL FOREIGN KEY REFERENCES dbo.orders(order_id) ON DELETE CASCADE,
    payment_method NVARCHAR(50) NOT NULL,
    card_type NVARCHAR(20) NULL,
    card_last_four NVARCHAR(4) NULL,
    cardholder_name NVARCHAR(100) NULL,
    transaction_reference NVARCHAR(100) NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_status NVARCHAR(50) DEFAULT 'pending',
    gateway_response NVARCHAR(MAX) NULL,
    failure_reason NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    processed_at DATETIME NULL
);
GO

-- 9. Create correct PascalCase ContactSubmissions table
CREATE TABLE dbo.ContactSubmissions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    Subject NVARCHAR(200) NOT NULL,
    Phone NVARCHAR(20) NULL,
    Message NVARCHAR(1000) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsRead BIT DEFAULT 0
);
GO

-- 10. Create correct PascalCase NewsletterSubscriptions table
CREATE TABLE dbo.NewsletterSubscriptions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO


-- STORED PROCEDURES
-- Drop existing stored procedures if they exist
IF OBJECT_ID('sp_CreateOrderWithPayment', 'P') IS NOT NULL DROP PROCEDURE sp_CreateOrderWithPayment;
IF OBJECT_ID('sp_AddOrderItems', 'P') IS NOT NULL DROP PROCEDURE sp_AddOrderItems;
IF OBJECT_ID('sp_ProcessPayment', 'P') IS NOT NULL DROP PROCEDURE sp_ProcessPayment;
GO


-- Create sp_CreateOrderWithPayment
CREATE PROCEDURE sp_CreateOrderWithPayment
    @p_user_id INT,
    @p_cart_items NVARCHAR(MAX),
    @p_subtotal DECIMAL(10, 2),
    @p_discount_code NVARCHAR(50),
    @p_shipping_address_id INT,
    @p_payment_method NVARCHAR(50),
    @p_card_type NVARCHAR(20),
    @p_card_number NVARCHAR(MAX),
    @p_expiry_date NVARCHAR(MAX),
    @p_cvv NVARCHAR(MAX),
    @p_cardholder_name NVARCHAR(100),
    @p_upi_id NVARCHAR(100),
    @p_bank_name NVARCHAR(100),
    @p_account_number NVARCHAR(MAX),
    @p_order_id INT OUTPUT,
    @p_order_number NVARCHAR(50) OUTPUT,
    @p_payment_id INT OUTPUT,
    @p_result NVARCHAR(100) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Generate Order Number
		SET @p_order_number = 'ORD' + REPLACE(CONVERT(VARCHAR(10), GETDATE(), 112), '-', '') + RIGHT('000000' + CAST(CAST(RAND() * 1000000 AS INT) AS VARCHAR), 6);

        -- Calculate total
        DECLARE @v_shipping_fee DECIMAL(10, 2) = 50.00;
        DECLARE @v_total DECIMAL(10, 2) = @p_subtotal + @v_shipping_fee;
        
        -- Insert Order
        INSERT INTO dbo.orders (
            user_id, order_number, subtotal, shipping_fee, total_amount,
            shipping_address_id, payment_method, payment_status, status
        )
        VALUES (
            @p_user_id, @p_order_number, @p_subtotal, @v_shipping_fee, @v_total,
            @p_shipping_address_id, @p_payment_method, 'pending', 'pending'
        );

        SET @p_order_id = SCOPE_IDENTITY();

        -- Insert Payment Log
        DECLARE @v_card_last_four NVARCHAR(4) = NULL;
        IF @p_card_number IS NOT NULL AND LEN(@p_card_number) >= 4
        BEGIN
            SET @v_card_last_four = RIGHT(@p_card_number, 4);
        END

        INSERT INTO dbo.payments (
            order_id, payment_method, card_type, card_last_four, cardholder_name,
            amount, payment_status
        )
        VALUES (
            @p_order_id, @p_payment_method, @p_card_type, @v_card_last_four, @p_cardholder_name,
            @v_total, 'pending'
        );

        SET @p_payment_id = SCOPE_IDENTITY();
        
        SET @p_result = 'Success';

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @p_result = ERROR_MESSAGE();
    END CATCH
END;
GO

-- Create sp_AddOrderItems
CREATE PROCEDURE sp_AddOrderItems
    @p_order_id INT,
    @p_cart_items NVARCHAR(MAX),
    @p_result NVARCHAR(100) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- In SQL Server 2016+, we can parse JSON.
        -- We insert the items directly from the JSON array.
        INSERT INTO dbo.order_items (order_id, product_id, quantity, price)
        SELECT 
            @p_order_id,
            JSON_VALUE(value, '$.id'),
            JSON_VALUE(value, '$.quantity'),
            JSON_VALUE(value, '$.price')
        FROM OPENJSON(@p_cart_items);

        SET @p_result = 'Success';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @p_result = ERROR_MESSAGE();
    END CATCH
END;
GO

-- Create sp_ProcessPayment
CREATE PROCEDURE sp_ProcessPayment
    @p_payment_id INT,
    @p_payment_status NVARCHAR(20),
    @p_gateway_response NVARCHAR(MAX),
    @p_failure_reason NVARCHAR(MAX),
    @p_result NVARCHAR(100) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.payments
        SET payment_status = @p_payment_status,
            gateway_response = @p_gateway_response,
            failure_reason = @p_failure_reason,
            processed_at = GETDATE()
        WHERE payment_id = @p_payment_id;

        -- Update order status based on payment status
        DECLARE @v_order_id INT;
        SELECT @v_order_id = order_id FROM dbo.payments WHERE payment_id = @p_payment_id;

        IF @p_payment_status = 'completed'
        BEGIN
            UPDATE dbo.orders 
            SET payment_status = 'completed', status = 'processing', updated_at = GETDATE()
            WHERE order_id = @v_order_id;
        END
        ELSE IF @p_payment_status = 'failed'
        BEGIN
            UPDATE dbo.orders 
            SET payment_status = 'failed', status = 'cancelled', updated_at = GETDATE()
            WHERE order_id = @v_order_id;
        END

        SET @p_result = 'Success';
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        SET @p_result = ERROR_MESSAGE();
    END CATCH
END;
GO

-- INSERT DEFAULT CATEGORIES AND SAMPLE PRODUCTS so data is visible
INSERT INTO dbo.Categories (Name, Description) VALUES ('Chips', 'Crispy potato chips');
INSERT INTO dbo.Categories (Name, Description) VALUES ('Puffs', 'Cheesy puffed snacks');

INSERT INTO dbo.Products (Name, Description, Price, CategoryId, SKU, StockQuantity, IsActive) 
VALUES ('Chili Lays', 'Spicy potato chips with chili flavor', 280.00, 1, 'SKU001', 50, 1);

INSERT INTO dbo.Products (Name, Description, Price, CategoryId, SKU, StockQuantity, IsActive) 
VALUES ('Classic Lays', 'Original salted potato chips', 250.00, 1, 'SKU002', 75, 1);

-- INSERT DEFAULT USERS
-- (Note: Password hashes are placeholders, please register/login via UI to create real users)
INSERT INTO dbo.users (first_name, last_name, email, password_hash, user_type, is_wholesale_approved) 
VALUES ('Admin', 'User', 'admin1234@gmail.com', 'placeholder_hash', 'admin', 1);

INSERT INTO dbo.users (first_name, last_name, email, password_hash, user_type, is_wholesale_approved) 
VALUES ('Test', 'Wholesale', 'test@wholesale.com', 'placeholder_hash', 'customer', 1);

INSERT INTO dbo.Products (Name, Description, Price, CategoryId, SKU, StockQuantity, IsActive) 
VALUES ('Cheese Puffs', 'Cheese flavored puffed snacks', 220.00, 2, 'SKU003', 30, 1);
GO
