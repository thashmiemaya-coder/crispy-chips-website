# Murukku Database Setup Guide

## Prerequisites
- SQL Server installed and running
- Node.js and npm installed

## Setup Instructions

### 1. Update Environment Variables
Edit the `.env` file in the backend folder with your SQL Server credentials:

```env
# SQL Server Configuration
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=MurukkuDB
DB_USER=your_actual_username
DB_PASSWORD=your_actual_password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 2. Run Database Setup
Run the setup script to create the database and all tables:

```bash
cd backend
node setupDb.js
```

### 3. Start the Backend Server
After setup is complete, start the server:

```bash
npm start
```

## Database Tables Created

1. **ContactSubmissions** - Contact form submissions
2. **Categories** - Product categories
3. **Products** - Product catalog
4. **Customers** - Customer information
5. **Orders** - Customer orders
6. **OrderItems** - Individual order items
7. **Wishlist** - Customer wishlists
8. **Cart** - Shopping cart items
9. **Reviews** - Product reviews
10. **NewsletterSubscriptions** - Newsletter subscribers

## API Endpoints Available

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create new category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Products
- `GET /api/products` - Get all products (with filtering and pagination)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact/submissions` - Get all submissions (admin)

### Health Check
- `GET /api/health` - Server health check

## Testing the Setup

1. **Test Database Connection:**
   ```bash
   node setupDb.js
   ```
   You should see success messages for each table creation.

2. **Test API Endpoints:**
   ```bash
   # Start the server
   npm start
   
   # Test health endpoint in another terminal
   curl http://localhost:5000/api/health
   ```

3. **Test with Browser:**
   Open `http://localhost:5000/api/health` in your browser.

## Common Issues

### Authentication Failed
- Check your SQL Server username and password in `.env`
- Ensure SQL Server is running with mixed authentication mode

### Connection Failed
- Verify SQL Server is running on the specified port
- Check firewall settings
- Ensure the server name is correct

### Permission Issues
- Ensure your SQL user has permission to create databases
- For production, consider using a dedicated database user

## Next Steps

1. Add sample data to test your application
2. Implement authentication and authorization
3. Add file upload functionality for product images
4. Set up proper error logging and monitoring
5. Configure CORS for your frontend domain
