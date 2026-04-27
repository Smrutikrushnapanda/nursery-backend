import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function verify() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing. Add it to your environment variables or .env file.');
    }

    const dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    console.log('Database connection initialized');

    // Check for null codes
    const nullCodes = await dataSource.query(
      'SELECT id, code FROM qr_codes WHERE code IS NULL'
    );
    console.log(`Found ${nullCodes.length} rows with null code:`);
    console.log(nullCodes);

    // Check for empty strings or whitespace only
    const emptyCodes = await dataSource.query(
      "SELECT id, code FROM qr_codes WHERE code IS NOT NULL AND (code = '' OR trim(code) = '')"
    );
    console.log(`Found ${emptyCodes.length} rows with empty or whitespace code:`);
    console.log(emptyCodes);

    // Check total count
    const totalCount = await dataSource.query('SELECT COUNT(*) FROM qr_codes');
    console.log(`Total rows in qr_codes: ${totalCount[0].count}`);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

verify();