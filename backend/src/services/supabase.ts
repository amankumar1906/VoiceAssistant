import { Pool } from 'pg';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in environment variables');
  console.error('Please check your backend/.env file');
  console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
} else {
  console.log('✓ DATABASE_URL is loaded');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the connection
pool.on('connect', () => {
  console.log('✓ Successfully connected to database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;
