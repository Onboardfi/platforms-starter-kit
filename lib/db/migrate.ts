import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const runMigrations = async () => {
  const migrationClient = postgres(process.env.DATABASE_URL!, { 
    max: 1,
    ssl: 'require',
    prepare: false,
  });

  const db = drizzle(migrationClient);

  console.log('⏳ Running migrations...');
  
  try {
    await migrate(db, {
      migrationsFolder: 'drizzle/migrations'
    });
    console.log('✅ Migrations completed');
  } catch (err) {
    console.error('❌ Migration failed');
    console.error(err);
    process.exit(1);
  }
  
  process.exit(0);
};

runMigrations();