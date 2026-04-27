import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing. Add it to your environment variables or .env file.');
    }

    // Since we are using PostgreSQL, we can set the type to 'postgres'
    // and use the URL. TypeORM will parse the URL.
    const dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      // We don't need to synchronize or log for this script
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    console.log('Database connection initialized');

    // Check for null codes
    const nullCodesCount = await dataSource.query(
      'SELECT COUNT(*) FROM qr_codes WHERE code IS NULL'
    );
    const count = parseInt(nullCodesCount[0].count);
    console.log(`Found ${count} rows with null code`);

    if (count > 0) {
      // Delete rows with null code
      const result = await dataSource.query(
        'DELETE FROM qr_codes WHERE code IS NULL'
      );
      console.log(`Deleted ${result[1]} rows with null code`);
    } else {
      console.log('No rows with null code found.');
    }

    await dataSource.destroy();
    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

bootstrap();