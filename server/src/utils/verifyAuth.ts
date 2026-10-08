import { AuthService } from '../services/auth/AuthService.js';
import { signupSchema, loginSchema } from '../validators/authValidators.js';

export async function runAuthVerifications(): Promise<boolean> {
  console.log('[TuneSense Verification] Running Stage 4 Authentication Security Tests:');

  const authService = new AuthService();

  // 1. Password Hashing & Comparison Test
  const testPassword = 'Password123!';
  const hash = await authService.hashPassword(testPassword);

  if (hash === testPassword || !hash.startsWith('$2')) {
    throw new Error('Password hash failed or did not generate bcrypt hash format');
  }

  const matches = await authService.comparePassword(testPassword, hash);
  const mismatch = await authService.comparePassword('WrongPassword!', hash);

  if (!matches || mismatch) {
    throw new Error('Password comparison test failed');
  }
  console.log('  ✓ Bcrypt password hashing & secure comparison: PASSED');

  // 2. JWT Generation & Verification Test (using temporary test secret if not set)
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters_long_12345';
  const testUserId = '670498b0123456789abcdef0';
  const token = authService.generateToken(testUserId);

  if (!token || typeof token !== 'string') {
    throw new Error('Token generation failed');
  }

  const payload = authService.verifyToken(token);
  if (payload.sub !== testUserId) {
    throw new Error('JWT verification payload mismatch');
  }
  console.log('  ✓ JWT creation & verification with minimal identity payload: PASSED');

  // 3. Zod Input Validation Tests
  const validSignup = signupSchema.safeParse({
    name: 'Alex Rivera',
    email: 'Alex@Vibe.fm',
    password: 'SecurePassword123!',
  });
  if (!validSignup.success || validSignup.data.email !== 'alex@vibe.fm') {
    throw new Error('Valid signup validation or email normalization failed');
  }
  console.log('  ✓ Valid signup input validation & email normalization: PASSED');

  const invalidEmail = signupSchema.safeParse({
    name: 'Alex Rivera',
    email: 'invalid-email',
    password: 'SecurePassword123!',
  });
  if (invalidEmail.success) {
    throw new Error('Invalid email should have failed validation');
  }
  console.log('  ✓ Invalid email rejection: PASSED');

  const shortPassword = signupSchema.safeParse({
    name: 'Alex Rivera',
    email: 'alex@vibe.fm',
    password: '123',
  });
  if (shortPassword.success) {
    throw new Error('Short password should have failed validation');
  }
  console.log('  ✓ Password length constraint (< 8 chars rejected): PASSED');

  const validLogin = loginSchema.safeParse({
    email: 'ALEX@VIBE.FM',
    password: 'AnyPassword',
  });
  if (!validLogin.success || validLogin.data.email !== 'alex@vibe.fm') {
    throw new Error('Login validation failed');
  }
  console.log('  ✓ Login input validation: PASSED');

  console.log('[TuneSense Verification] All Stage 4 authentication logic tests PASSED.');
  return true;
}

if (process.argv[1]?.includes('verifyAuth')) {
  void runAuthVerifications();
}
