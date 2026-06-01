const { executeQuery } = require('./config/database');

async function testOrdersQuery() {
    try {
        const query = `
            SELECT o.*, u.first_name, u.last_name, u.email as user_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.user_id
            ORDER BY o.order_date DESC
        `;
        console.log('Running query...');
        const result = await executeQuery(query);
        console.log('Success! Found %d orders', result.recordset.length);
        console.table(result.recordset);
    } catch (error) {
        console.error('Query Failed!');
        console.error(error.message);
        if (error.originalError) {
          console.error('Original Error:', error.originalError.message);
        }
    } finally {
        process.exit();
    }
}

testOrdersQuery();
