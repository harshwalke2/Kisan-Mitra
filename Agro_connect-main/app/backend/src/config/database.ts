import knex from 'knex';
import { logger } from '../utils/logger';

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'agroconnect',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 20
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './seeds'
  }
};

export const db = knex(config);

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  try {
    // Check if tables exist
    const hasTables = await db.schema.hasTable('users');
    
    if (!hasTables) {
      logger.info('Creating database tables...');
      await db.migrate.latest();
      logger.info('Database tables created successfully');
      
      // Seed initial data
      await db.seed.run();
      logger.info('Database seeded successfully');
    }
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

export default db;
