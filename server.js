require('dotenv').config();
// === DEBUG: Check env variables ===
console.log('🔍 EMAIL_USER loaded:', process.env.EMAIL_USER ? '✅ Yes' : '❌ No');
console.log('🔍 EMAIL_PASS length:', process.env.EMAIL_PASS?.length || '❌ Not loaded');
console.log('🔍 EMAIL_PASS has leading space:', process.env.EMAIL_PASS?.startsWith(' ') ? '⚠️ Yes' : '✅ No');
// ================================
const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('./config/database');
const { sendContactNotification } = require('./config/email');
const { sendOrderUpdateSMS } = require('./config/sms');

const app = express();
const PORT = process.env.PORT || 5000;

const bcrypt = require('bcrypt');
const saltRounds = 10;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// User registration endpoint
app.post('/api/register', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone().withMessage('Please provide a valid phone number')
], handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists
    const checkUserQuery = 'SELECT user_id FROM users WHERE email = @email';
    const existingUser = await executeQuery(checkUserQuery, { email });

    if (existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertUserQuery = `
      INSERT INTO users (first_name, last_name, email, password_hash, phone, created_at, updated_at)
      VALUES (@firstName, @lastName, @email, @passwordHash, @phone, GETDATE(), GETDATE())
    `;

    const params = {
      firstName,
      lastName,
      email,
      passwordHash,
      phone: phone || null
    };

    await executeQuery(insertUserQuery, params);

    res.status(201).json({
      success: true,
      message: 'User registered successfully!'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again later.'
    });
  }
});

// User login endpoint
app.post('/api/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const getUserQuery = 'SELECT user_id, first_name, last_name, email, password_hash, user_type, is_wholesale_approved FROM users WHERE email = @email';
    const result = await executeQuery(getUserQuery, { email });

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = result.recordset[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        user_type: user.user_type,
        is_wholesale_approved: user.is_wholesale_approved
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again later.'
    });
  }
});

// Contact form submission endpoint
app.post('/api/contact', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone().withMessage('Please provide a valid phone number'),
  body('message').trim().isLength({ min: 5, max: 1000 }).withMessage('Message must be between 5 and 1000 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { name, email, subject, phone, message } = req.body;

    // Send email notification
    await sendContactNotification({
      name,
      email,
      subject,
      phone,
      message
    });

    // Save to database
    const query = `
      INSERT INTO ContactSubmissions (Name, Email, Subject, Phone, Message)
      VALUES (@name, @email, @subject, @phone, @message)
    `;
    await executeQuery(query, {
      name,
      email,
      subject,
      phone: phone || null,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully! We will get back to you soon.'
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// Get all contact submissions (admin endpoint)
app.get('/api/contact/submissions', async (req, res) => {
  try {
    const query = `
      SELECT Id, Name, Email, Subject, Phone, Message, CreatedAt
      FROM ContactSubmissions
      ORDER BY CreatedAt DESC
    `;

    const result = await executeQuery(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact submissions'
    });
  }
});

// Categories API endpoints

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const query = `
      SELECT Id, Name, Description, ImageUrl, IsActive, CreatedAt, UpdatedAt
      FROM Categories
      WHERE IsActive = 1
      ORDER BY Name
    `;

    const result = await executeQuery(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Get category by ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT Id, Name, Description, ImageUrl, IsActive, CreatedAt, UpdatedAt
      FROM Categories
      WHERE Id = @id
    `;

    const result = await executeQuery(query, { id });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category'
    });
  }
});

// Create new category (admin)
app.post('/api/categories', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('Image URL must be a valid URL')
], handleValidationErrors, async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    const query = `
      INSERT INTO Categories (Name, Description, ImageUrl, CreatedAt, UpdatedAt)
      VALUES (@name, @description, @imageUrl, GETDATE(), GETDATE())
    `;

    const params = { name, description: description || null, imageUrl: imageUrl || null };
    await executeQuery(query, params);

    res.status(201).json({
      success: true,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Error creating category:', error);
    if (error.number === 2627) { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating category'
    });
  }
});

// Update category (admin)
app.put('/api/categories/:id', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('Image URL must be a valid URL'),
  body('isActive').optional({ values: 'falsy' }).isBoolean().withMessage('IsActive must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, isActive } = req.body;

    const query = `
      UPDATE Categories 
      SET Name = @name, 
          Description = @description, 
          ImageUrl = @imageUrl,
          IsActive = @isActive,
          UpdatedAt = GETDATE()
      WHERE Id = @id
    `;

    const params = {
      id,
      name,
      description: description || null,
      imageUrl: imageUrl || null,
      isActive: isActive !== undefined ? isActive : true
    };

    const result = await executeQuery(query, params);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Error updating category:', error);
    if (error.number === 2627) { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating category'
    });
  }
});

// Delete category (admin)
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const checkProductsQuery = `
      SELECT COUNT(*) as count FROM Products WHERE CategoryId = @id
    `;
    const productsResult = await executeQuery(checkProductsQuery, { id });

    if (productsResult.recordset[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing products'
      });
    }

    const query = `
      DELETE FROM Categories WHERE Id = @id
    `;

    const result = await executeQuery(query, { id });

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category'
    });
  }
});

// Products API endpoints

// Get all products with optional filtering
app.get('/api/products', async (req, res) => {
  try {
    const { category, featured, minPrice, maxPrice, search, page = 1, limit = 10 } = req.query;

    let query = `
      SELECT p.*, c.Name as CategoryName
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryId = c.Id
      WHERE p.IsActive = 1
    `;

    const params = {};

    // Add filters
    if (category) {
      query += ` AND p.CategoryId = @category`;
      params.category = category;
    }

    if (featured === 'true') {
      query += ` AND p.IsFeatured = 1`;
    }

    if (minPrice) {
      query += ` AND (p.DiscountPrice IS NULL ? p.Price : p.DiscountPrice) >= @minPrice`;
      params.minPrice = parseFloat(minPrice);
    }

    if (maxPrice) {
      query += ` AND (p.DiscountPrice IS NULL ? p.Price : p.DiscountPrice) <= @maxPrice`;
      params.maxPrice = parseFloat(maxPrice);
    }

    if (search) {
      query += ` AND (p.Name LIKE @search OR p.Description LIKE @search)`;
      params.search = `%${search}%`;
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` ORDER BY p.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    params.offset = offset;
    params.limit = parseInt(limit);

    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
    const countResult = await executeQuery(countQuery, params);

    const result = await executeQuery(query, params);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.recordset[0].total,
        pages: Math.ceil(countResult.recordset[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*, c.Name as CategoryName
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryId = c.Id
      WHERE p.Id = @id AND p.IsActive = 1
    `;

    const result = await executeQuery(query, { id });

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
});

// Create new product (admin)
app.post('/api/products', [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number'),
  body('categoryId').isInt({ min: 1 }).withMessage('Category ID is required'),
  body('sku').trim().isLength({ min: 1, max: 50 }).withMessage('SKU is required'),
  body('stockQuantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('dimensions').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Dimensions must not exceed 100 characters'),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('Image URL must be a valid URL'),
  body('isFeatured').optional({ values: 'falsy' }).isBoolean().withMessage('IsFeatured must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      categoryId,
      sku,
      stockQuantity,
      weight,
      dimensions,
      imageUrl,
      additionalImages,
      isFeatured
    } = req.body;

    const query = `
      INSERT INTO Products (
        Name, Description, Price, DiscountPrice, CategoryId, SKU, 
        StockQuantity, Weight, Dimensions, ImageUrl, AdditionalImages, 
        IsFeatured, CreatedAt, UpdatedAt
      )
      VALUES (
        @name, @description, @price, @discountPrice, @categoryId, @sku,
        @stockQuantity, @weight, @dimensions, @imageUrl, @additionalImages,
        @isFeatured, GETDATE(), GETDATE()
      )
    `;

    const params = {
      name,
      description: description || null,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      categoryId: parseInt(categoryId),
      sku,
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
      weight: weight ? parseFloat(weight) : null,
      dimensions: dimensions || null,
      imageUrl: imageUrl || null,
      additionalImages: additionalImages ? JSON.stringify(additionalImages) : null,
      isFeatured: isFeatured || false
    };

    await executeQuery(query, params);

    res.status(201).json({
      success: true,
      message: 'Product created successfully'
    });

  } catch (error) {
    console.error('Error creating product:', error);
    if (error.number === 2627) { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    if (error.number === 547) { // Foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
});

// Update product (admin)
app.put('/api/products/:id', [
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number'),
  body('categoryId').isInt({ min: 1 }).withMessage('Category ID is required'),
  body('sku').trim().isLength({ min: 1, max: 50 }).withMessage('SKU is required'),
  body('stockQuantity').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
  body('dimensions').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Dimensions must not exceed 100 characters'),
  body('imageUrl').optional({ values: 'falsy' }).isURL().withMessage('Image URL must be a valid URL'),
  body('isFeatured').optional({ values: 'falsy' }).isBoolean().withMessage('IsFeatured must be a boolean'),
  body('isActive').optional({ values: 'falsy' }).isBoolean().withMessage('IsActive must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      discountPrice,
      categoryId,
      sku,
      stockQuantity,
      weight,
      dimensions,
      imageUrl,
      additionalImages,
      isFeatured,
      isActive
    } = req.body;

    const query = `
      UPDATE Products 
      SET Name = @name,
          Description = @description,
          Price = @price,
          DiscountPrice = @discountPrice,
          CategoryId = @categoryId,
          SKU = @sku,
          StockQuantity = @stockQuantity,
          Weight = @weight,
          Dimensions = @dimensions,
          ImageUrl = @imageUrl,
          AdditionalImages = @additionalImages,
          IsFeatured = @isFeatured,
          IsActive = @isActive,
          UpdatedAt = GETDATE()
      WHERE Id = @id
    `;

    const params = {
      id,
      name,
      description: description || null,
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : null,
      categoryId: parseInt(categoryId),
      sku,
      stockQuantity: stockQuantity ? parseInt(stockQuantity) : 0,
      weight: weight ? parseFloat(weight) : null,
      dimensions: dimensions || null,
      imageUrl: imageUrl || null,
      additionalImages: additionalImages ? JSON.stringify(additionalImages) : null,
      isFeatured: isFeatured || false,
      isActive: isActive !== undefined ? isActive : true
    };

    const result = await executeQuery(query, params);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Error updating product:', error);
    if (error.number === 2627) { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    if (error.number === 547) { // Foreign key violation
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
});

// Delete product (admin)
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product is in any orders
    const checkOrdersQuery = `
      SELECT COUNT(*) as count FROM order_items WHERE product_id = @id
    `;
    const ordersResult = await executeQuery(checkOrdersQuery, { id });

    if (ordersResult.recordset[0].count > 0) {
      // Instead of deleting, mark as inactive
      const query = `
        UPDATE Products SET IsActive = 0, UpdatedAt = GETDATE() WHERE Id = @id
      `;
      await executeQuery(query, { id });

      return res.json({
        success: true,
        message: 'Product deactivated (has existing orders)'
      });
    }

    const query = `
      DELETE FROM Products WHERE Id = @id
    `;

    const result = await executeQuery(query, { id });

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Wholesale order endpoint
app.post('/api/checkout/create-wholesale-order', async (req, res) => {
  try {
    const {
      userId,
      cartItems,
      subtotal,
      shippingFee,
      total,
      shippingAddress,
      orderType,
      paymentStatus,
      collectionDate
    } = req.body;

    // Validate required fields
    if (!cartItems || !subtotal || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cartItems, subtotal, userId'
      });
    }

    // Generate order number
    const orderNumber = 'WS' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Insert wholesale order
    const orderQuery = `
      SET NOCOUNT ON;
      INSERT INTO orders (
        user_id, order_number, status, subtotal, shipping_fee, total_amount,
        recipient_name, phone_number, region_city_district, shipping_address, postal_code,
        payment_status, order_type, order_date, collection_date
      ) VALUES (
        @userId, @orderNumber, 'pending', @subtotal, @shippingFee, @total,
        @recipientName, @phoneNumber, @regionCityDistrict, @address, @postalCode,
        @paymentStatus, @orderType, GETDATE(), @collectionDate
      );
      
      SELECT SCOPE_IDENTITY() as order_id;
    `;

    const orderResult = await executeQuery(orderQuery, {
      userId: userId || null,
      orderNumber: orderNumber || null,
      subtotal: subtotal || 0,
      shippingFee: shippingFee || 50,
      total: total || 0,
      recipientName: shippingAddress?.recipient_name || shippingAddress?.recipientName || null,
      phoneNumber: shippingAddress?.phone_number || shippingAddress?.phoneNumber || null,
      regionCityDistrict: shippingAddress?.region_city_district || shippingAddress?.regionCityDistrict || null,
      address: shippingAddress?.address || null,
      postalCode: shippingAddress?.postal_code || shippingAddress?.postalCode || null,
      paymentStatus: paymentStatus || 'pending',
      orderType: orderType || 'wholesale',
      collectionDate: collectionDate && collectionDate !== '' ? collectionDate : null
    });

    if (!orderResult.recordset || orderResult.recordset.length === 0) {
      throw new Error('Failed to retrieve order ID after insertion');
    }

    const orderId = orderResult.recordset[0].order_id;

    // Insert order items
    for (const item of cartItems) {
      const itemQuery = `
        INSERT INTO order_items (
          order_id, product_id, quantity, price
        ) VALUES (
          @orderId, @productId, @quantity, @price
        );
      `;

      await executeQuery(itemQuery, {
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      });
    }

    res.json({
      success: true,
      message: 'Wholesale order created successfully',
      data: {
        orderId: orderId,
        orderNumber: orderNumber,
        totalAmount: total
      }
    });

  } catch (error) {
    console.error('Error creating wholesale order:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Admin endpoints for order management
app.get('/api/admin/orders', async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*,
        u.first_name + ' ' + u.last_name as customer_name,
        u.email as customer_email,
        COUNT(oi.order_item_id) as item_count
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      GROUP BY o.order_id, o.user_id, o.order_number, o.status, 
        o.subtotal, o.discount_amount, o.discount_percentage,
        o.shipping_fee, o.total_amount, o.shipping_address_id,
        o.recipient_name, o.phone_number, o.region_city_district,
        o.shipping_address, o.postal_code, o.payment_method,
        o.payment_status, o.transaction_id, o.order_notes,
        o.estimated_delivery, o.actual_delivery, o.order_date,
        o.confirmed_date, o.shipped_date, o.delivered_date, o.collection_date, o.updated_at,
        u.first_name, u.last_name, u.email, o.order_type
      ORDER BY o.order_date DESC
    `;

    const result = await executeQuery(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.get('/api/admin/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderQuery = `
      SELECT 
        o.*,
        u.first_name + ' ' + u.last_name as customer_name,
        u.email as customer_email,
        u.phone_number as customer_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = @id
    `;

    const orderResult = await executeQuery(orderQuery, { id });

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items
    const itemsQuery = `
      SELECT * FROM order_items 
      WHERE order_id = @id
    `;

    const itemsResult = await executeQuery(itemsQuery, { id });

    res.json({
      success: true,
      data: {
        order: orderResult.recordset[0],
        items: itemsResult.recordset
      }
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const query = `
      UPDATE orders 
      SET status = @status, updated_at = GETDATE()
      WHERE order_id = @id
    `;

    const result = await executeQuery(query, { id, status });

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // --- Start Notification Logic ---
    try {
      // Fetch order details for the notification
      const orderDetailsQuery = `
        SELECT o.order_number, o.status, o.phone_number as order_phone, 
               o.recipient_name, u.first_name, u.phone as user_phone
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        WHERE o.order_id = @id
      `;
      const orderDetailsResult = await executeQuery(orderDetailsQuery, { id });
      
      if (orderDetailsResult.recordset.length > 0) {
        const order = orderDetailsResult.recordset[0];
        const customerName = order.recipient_name || order.first_name || 'Customer';
        const phone = order.order_phone || order.user_phone;
        
        if (phone) {
          await sendOrderUpdateSMS(customerName, phone, order.order_number, status);
        } else {
          console.log(`⚠️ Could not send SMS for order #${order.order_number}: No phone number found.`);
        }
      }
    } catch (notifError) {
      console.error('Error triggering notification:', notifError);
    }
    // --- End Notification Logic ---

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Checkout routes
const checkoutRoutes = require('./routes/checkout-simple');
app.use('/api/checkout', checkoutRoutes);

// Test database route
const testDbRoutes = require('./routes/test-db');
app.use('/api/test', testDbRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// Get orders for a specific user
app.get('/api/user/:userId/orders', async (req, res) => {
  try {
    const { userId } = req.params;

    const ordersQuery = `
      SELECT 
        o.order_id, o.order_number, o.status, o.subtotal,
        o.shipping_fee, o.total_amount, o.payment_status,
        o.recipient_name, o.phone_number, o.region_city_district,
        o.shipping_address, o.postal_code,
        o.collection_date, o.order_date, o.order_type
      FROM orders o
      WHERE o.user_id = @userId
      ORDER BY o.order_date DESC
    `;

    const ordersResult = await executeQuery(ordersQuery, { userId });

    const orders = [];
    for (const order of ordersResult.recordset) {
      const itemsQuery = `
        SELECT oi.order_item_id, oi.quantity, oi.price,
               p.Name as product_name, p.ImageUrl as image_url
        FROM order_items oi
        LEFT JOIN Products p ON oi.product_id = p.Id
        WHERE oi.order_id = @orderId
      `;
      const itemsResult = await executeQuery(itemsQuery, { orderId: order.order_id });
      orders.push({ ...order, items: itemsResult.recordset });
    }

    res.json({ success: true, data: orders });

  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Get all customers for admin
app.get('/api/admin/customers', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.user_type,
        u.is_wholesale_approved,
        u.is_active,
        u.created_at,
        COUNT(o.order_id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.user_id = o.user_id
      GROUP BY 
        u.user_id, u.first_name, u.last_name, u.email,
        u.phone, u.user_type, u.is_wholesale_approved,
        u.is_active, u.created_at
      ORDER BY u.created_at DESC
    `;
    const result = await executeQuery(query);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Get all products for admin (including inactive)
app.get('/api/admin/products', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.Name as CategoryName
      FROM Products p
      LEFT JOIN Categories c ON p.CategoryId = c.Id
      ORDER BY p.CreatedAt DESC
    `;
    const result = await executeQuery(query);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Get all categories for admin (including inactive)
app.get('/api/admin/categories', async (req, res) => {
  try {
    const query = `
      SELECT * FROM Categories ORDER BY Name
    `;
    const result = await executeQuery(query);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Get stock levels for multiple products
app.post('/api/products/stock', async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const query = `
      SELECT Id, StockQuantity 
      FROM Products 
      WHERE Id IN (${productIds.map((_, i) => `@id${i}`).join(',')})
    `;
    
    const params = {};
    productIds.forEach((id, i) => {
      params[`id${i}`] = id;
    });

    const result = await executeQuery(query, params);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
