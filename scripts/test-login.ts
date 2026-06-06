import dotenv from 'dotenv';
dotenv.config();

// We'll test against a local server running on port 3000.
// If the server uses a different port, update the BASE_URL.
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testRateLimit(poppoId: string) {
  console.log(`\n[Test 1] Starting Rate Limit Test for Poppo ID: ${poppoId}`);
  
  // We will hit the endpoint 6 times. The 6th should be a 429.
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/login-with-poppo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poppoId, tempPassword: 'wrong-password' })
    });
    
    const data = await res.json().catch(() => null);
    console.log(`Attempt ${i} - Status: ${res.status} - Response:`, data);
    
    if (i === 6) {
      if (res.status === 429) {
        console.log(`✅ Success: Rate limiter successfully blocked the 6th request.`);
      } else {
        console.error(`❌ Failure: Expected 429 on 6th request, but got ${res.status}`);
      }
    }
  }
}

async function testCheckUsername(poppoId: string) {
  console.log(`\n[Test 2] Checking username exists in DB for: ${poppoId}`);
  const res = await fetch(`${BASE_URL}/api/auth/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poppoId })
  });
  
  const data = await res.json();
  console.log(`Check Username Response:`, data);
  if (data.exists) {
    console.log(`✅ Success: User successfully identified in Firestore.`);
  } else {
    console.error(`❌ Failure: User not found in Firestore. Is staticHosts fallback completely removed?`);
  }
}

async function runTests() {
  // Use a known Director ID or a safe active host ID from the database
  const TARGET_POPPO_ID = '19157913'; 
  
  try {
    await testCheckUsername(TARGET_POPPO_ID);
    await testRateLimit(TARGET_POPPO_ID);
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTests();
