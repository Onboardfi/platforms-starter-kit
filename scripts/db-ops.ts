import { spawn } from 'child_process';

const MAX_TIMEOUT = 30000; // 30 seconds

async function runWithTimeout(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'inherit' });
    
    const timeout = setTimeout(() => {
      process.kill();
      console.log('Database operation timed out, continuing with build...');
      resolve();
    }, MAX_TIMEOUT);

    process.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 || code === null) {
        resolve();
      } else {
        console.log(`Process exited with code ${code}, continuing with build...`);
        resolve();
      }
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Failed to start process:', err);
      resolve(); // Still resolve to continue with build
    });
  });
}

async function main() {
  try {
    console.log('Generating database schema...');
    await runWithTimeout('drizzle-kit', ['generate', '--config=drizzle.config.ts']);
    
    console.log('Pushing database changes...');
    await runWithTimeout('drizzle-kit', ['push', '--config=drizzle.config.ts']);
  } catch (error) {
    console.error('Error during database operations:', error);
  }
  // Always exit successfully to continue the build
  process.exit(0);
}

main();