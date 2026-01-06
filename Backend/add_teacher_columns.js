// Script to add gender and address columns to teachers table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function addColumns() {
  try {
    console.log('Adding gender and address columns to teachers table...');
    
    await pool.query(`
      ALTER TABLE teachers 
      ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other'))
    `);
    
    await pool.query(`
      ALTER TABLE teachers 
      ADD COLUMN IF NOT EXISTS address TEXT
    `);
    
    console.log('✅ Columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addColumns();
