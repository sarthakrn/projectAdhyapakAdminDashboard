// Utility functions for testing token expiry functionality

export const createExpiredToken = () => {
  // Create a JWT token that's already expired
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user',
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
    iss: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_Xp11tf9vC'
  }));
  const signature = 'test-signature';
  
  return `${header}.${payload}.${signature}`;
};

export const createValidToken = (expiresInMinutes = 60) => {
  // Create a JWT token that's still valid
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user',
    exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_Xp11tf9vC'
  }));
  const signature = 'test-signature';
  
  return `${header}.${payload}.${signature}`;
};

export const createSoonExpiringToken = (expiresInMinutes = 2) => {
  // Create a JWT token that expires soon (within 5 minutes)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: 'test-user',
    exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: 'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_Xp11tf9vC'
  }));
  const signature = 'test-signature';
  
  return `${header}.${payload}.${signature}`;
};

// Test function to simulate API call with expired token
export const testTokenExpiryHandling = async () => {
  const studentApiService = (await import('../services/studentApiService')).default;
  
  console.log('🧪 Testing token expiry handling...');
  
  // Test with expired token
  const expiredToken = createExpiredToken();
  const mockUser = { id_token: expiredToken, profile: { preferred_username: 'testschool' } };
  
  try {
    const result = await studentApiService.getStudents('10', mockUser);
    console.log('📊 Result with expired token:', result);
    
    if (result.sessionExpired) {
      console.log('✅ Token expiry correctly detected!');
    } else {
      console.log('❌ Token expiry not detected');
    }
  } catch (error) {
    console.log('⚠️ Error during test:', error.message);
  }
};

// Add to window for manual testing in browser console
if (typeof window !== 'undefined') {
  window.tokenTestUtils = {
    createExpiredToken,
    createValidToken,
    createSoonExpiringToken,
    testTokenExpiryHandling
  };
}