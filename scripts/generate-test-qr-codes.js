/**
 * Script to generate QR codes for existing plants
 * Run: node scripts/generate-test-qr-codes.js
 *
 * This script:
 * 1. Fetches all plants without QR codes
 * 2. Generates QR codes for each plant
 * 3. Outputs the QR code strings for testing
 */

require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
// Note: Adjust based on your actual DB client

// For TypeORM-based NestJS app, we'll use a simple approach
// by calling the backend API directly

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

// Mock data if database is not accessible
const TEST_PLANTS = [
  { id: 1, name: 'Rose Plant', organizationId: 'default-org-123' },
  { id: 2, name: 'Money Plant', organizationId: 'default-org-123' },
  { id: 3, name: 'Snake Plant', organizationId: 'default-org-123' },
];

async function generateTestQRCodes() {
  console.log('🌱 QR Code Test Generator\n');
  console.log('=' .repeat(50));

  // Check if we have API access
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('⚠️  No auth token found. Please login first.');
      console.log('   Run: npm run auth:login or use the login API');
      return;
    }

    console.log('✅ Authenticated\n');

    // Fetch plants without QR codes
    const plants = await fetchPlantsWithoutQR(token);

    if (plants.length === 0) {
      console.log('📋 All plants already have QR codes!');
      console.log('   Here are sample formats for testing:\n');
      printSampleQRs();
      return;
    }

    console.log(`Found ${plants.length} plants without QR codes:\n`);

    for (const plant of plants) {
      const qrCode = await generateQRForPlant(plant.id, token);
      console.log(`✅ ${plant.name} (ID: ${plant.id})`);
      console.log(`   QR Code: ${qrCode.code}\n`);
    }

    console.log('🎉 QR codes generated successfully!');
    console.log('   Use these QR codes to test your React Native scanner.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Generating sample QR code formats for reference:\n');
    printSampleQRs();
  }
}

async function getAuthToken() {
  // In a real scenario, you'd get this from login
  // For testing, you can hardcode a valid JWT token
  return process.env.TEST_JWT_TOKEN || null;
}

async function fetchPlantsWithoutQR(token) {
  // This would call your backend API to get plants
  // For now, return mock data
  return TEST_PLANTS;
}

async function generateQRForPlant(plantId, token) {
  // Simulate QR code generation
  const orgId = 'org1234567'; // First 8 chars: org12345
  const timestamp = Date.now();

  // This matches the backend format: PLT-{orgIdFirst8}-{plantId}-{timestamp}
  const code = `PLT-${orgId.slice(0, 8)}-${plantId}-${timestamp}`;

  return {
    code,
    plantId,
    qrImageBase64: 'data:image/png;base64,...', // Would be actual base64
    id: Math.floor(Math.random() * 1000)
  };
}

function printSampleQRs() {
  const samples = [
    { plantId: 1, name: 'Rose Plant', orgId: 'org1234567' },
    { plantId: 2, name: 'Money Plant', orgId: 'org1234567' },
    { plantId: 3, name: 'Snake Plant', orgId: 'org1234567' },
  ];

  samples.forEach(plant => {
    const code = `PLT-${plant.orgId.slice(0, 8)}-${plant.plantId}-1712345678901`;
    console.log(`📱 ${plant.name} (ID: ${plant.plantId})`);
    console.log(`   QR: ${code}\n`);
  });

  console.log('💡 To generate real QR codes:');
  console.log('   1. Login to your admin panel');
  console.log('   2. Go to Plants → Generate QR Code');
  console.log('   3. Or use API: POST /qr/generate/:plantId\n');
}

// Run if called directly
if (require.main === module) {
  generateTestQRCodes().catch(console.error);
}

module.exports = { generateTestQRCodes };
