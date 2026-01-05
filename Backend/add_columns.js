const { pool } = require('./src/config/database');

async function addColumns() {
  try {
    console.log('Adding missing columns to students table...');
    
    await pool.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
      ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
      ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20),
      ADD COLUMN IF NOT EXISTS father_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS father_cnic VARCHAR(20),
      ADD COLUMN IF NOT EXISTS date_of_birth DATE;
    `);
    
    console.log('✅ Columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    process.exit(1);
  }
}

addColumns();
