import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const runMigrations = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  // Mask sensitive info for logging
  const maskedUrl = process.env.DATABASE_URL.replace(/(:[^:@]{2})[^:@]*@/, '$1****@');
  console.log('⏳ Initializing database connection for migration...');
  console.log(`Using database URL: ${maskedUrl}`);

  const migrationClient = postgres(process.env.DATABASE_URL, {
    max: 1, // Use max 1 connection for migrations
    ssl: {
      rejectUnauthorized: false // Required for some hosting providers
    },
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  try {
    // Test connection using raw SQL template literal
    const result = await migrationClient`SELECT NOW()`;
    console.log('✅ Database connection successful:', result[0].now);

    const db = drizzle(migrationClient);

    console.log('⏳ Running migrations...');
    await migrate(db, {
      migrationsFolder: 'drizzle/migrations'
    });

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error; // Re-throw to trigger the catch in the main block
  } finally {
    await migrationClient.end();
  }
};

// Add better error handling for the main process
runMigrations()
  .catch((err) => {
    console.error('❌ Migration script failed:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('👋 Migration script finished');
    process.exit(0);
  });