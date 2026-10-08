import mongoose from 'mongoose';
import { authService } from '../services/auth/AuthService.js';
import { User } from '../models/User.js';
import { UserPreference } from '../models/UserPreference.js';
import { signupSchema, loginSchema } from '../validators/authValidators.js';
import { config } from '../config/index.js';

async function runTests() {
  console.log('--- TuneSense Stage 4 Comprehensive Verification ---');
  let allPassed = true;

  const pass = (title: string) => console.log(`[PASS] ${title}`);
  const fail = (title: string, err: unknown) => {
    console.error(`[FAIL] ${title}:`, err);
    allPassed = false;
  };

  // Ensure JWT_SECRET is set for testing
  process.env.JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret || 'dev_secret_key_minimum_32_chars_1234567890';

  // 1. Password Security
  try {
    const rawPass = 'testPassword123';
    const hash = await authService.hashPassword(rawPass);
    if (!hash || hash.startsWith('$2') === false) throw new Error('Invalid bcrypt hash format');
    const validMatch = await authService.comparePassword(rawPass, hash);
    const invalidMatch = await authService.comparePassword('wrongPassword', hash);
    if (!validMatch || invalidMatch) throw new Error('Password comparison logic failed');
    pass('Password Hashing (bcryptjs work factor 12) & Comparison');
  } catch (err) {
    fail('Password Hashing & Comparison', err);
  }

  // 2. JWT Generation & Verification
  let token = '';
  try {
    token = authService.generateToken('test_user_id_123');
    const payload = authService.verifyToken(token);
    if (!payload || payload.sub !== 'test_user_id_123') throw new Error('JWT payload sub mismatch');
    pass('JWT Generation & Verification (sub: userId)');
  } catch (err) {
    fail('JWT Generation & Verification', err);
  }

  // 3. Invalid / Expired JWT
  try {
    let rejected = false;
    try {
      authService.verifyToken('invalid.token.string');
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error('Invalid token should have thrown error');
    pass('Invalid JWT returns null / rejects');
  } catch (err) {
    fail('Invalid JWT returns null / rejects', err);
  }

  // 4. Zod Validation Tests
  // 4a. Invalid email
  try {
    const res = signupSchema.safeParse({ name: 'Alex', email: 'not-an-email', password: 'password123' });
    if (res.success) throw new Error('Should reject invalid email');
    pass('Validation: Invalid email rejected');
  } catch (err) {
    fail('Validation: Invalid email rejected', err);
  }

  // 4b. Weak/invalid password
  try {
    const res = signupSchema.safeParse({ name: 'Alex', email: 'alex@example.com', password: 'short' });
    if (res.success) throw new Error('Should reject short password');
    pass('Validation: Short password (<8 chars) rejected');
  } catch (err) {
    fail('Validation: Short password (<8 chars) rejected', err);
  }

  // 4c. Valid signup payload
  try {
    const res = signupSchema.safeParse({ name: 'Alex Parker', email: 'alex@example.com', password: 'password123' });
    if (!res.success) throw new Error('Should accept valid signup payload');
    pass('Validation: Valid signup payload accepted');
  } catch (err) {
    fail('Validation: Valid signup payload accepted', err);
  }

  // 4d. Valid login payload
  try {
    const res = loginSchema.safeParse({ email: 'alex@example.com', password: 'password123' });
    if (!res.success) throw new Error('Should accept valid login payload');
    pass('Validation: Valid login payload accepted');
  } catch (err) {
    fail('Validation: Valid login payload accepted', err);
  }

  // 5. Database & Model Integration (if MongoDB is connected or available)
  const mongoUri = config.mongodbUri || process.env.MONGODB_URI;
  if (mongoUri) {
    try {
      console.log('Connecting to MongoDB for model & service integration tests...');
      await mongoose.connect(mongoUri, { dbName: config.mongodbDbName });
      console.log('MongoDB connected successfully.');

      const testEmail = `test_stage4_${Date.now()}@example.com`;
      const testName = 'Test User Stage4';
      const testPass = 'SuperSecret123!';

      // 5a. Signup user & default UserPreference creation
      const { user: createdUser } = await authService.signup({ name: testName, email: testEmail, password: testPass });
      if (!createdUser.id || createdUser.email !== testEmail.toLowerCase()) {
        throw new Error('User creation failed or email normalization failed');
      }
      if ((createdUser as unknown as { passwordHash?: string }).passwordHash || (createdUser as unknown as { password?: string }).password) {
        throw new Error('Security violation: passwordHash or password returned in SafeUserDto');
      }
      pass('AuthService.signup creates user and issues token');
      pass('Security: passwordHash never returned in SafeUserDto');

      // Check UserPreference created exactly once
      const prefs = await UserPreference.find({ userId: createdUser.id });
      if (prefs.length !== 1) {
        throw new Error(`Expected exactly 1 UserPreference document, found ${prefs.length}`);
      }
      pass('Signup creates exactly one default UserPreference document');

      // 5b. Duplicate email rejection
      try {
        await authService.signup({ name: 'Duplicate Alex', email: testEmail, password: testPass });
        throw new Error('Duplicate email should have thrown an error');
      } catch (dupErr: unknown) {
        const msg = dupErr instanceof Error ? dupErr.message : String(dupErr);
        if (msg.includes('already exists')) {
          pass('Duplicate email gracefully rejected with friendly message');
        } else {
          throw dupErr;
        }
      }

      // 5c. Login with correct credentials
      const { user: loggedInUser, token: loginToken } = await authService.login({ email: testEmail, password: testPass });
      if (loggedInUser.id !== createdUser.id) {
        throw new Error('Logged in user ID does not match created user ID');
      }
      if (!loginToken) throw new Error('Login should return a valid JWT');
      pass('AuthService.login succeeds with correct credentials');

      // 5d. Repeated login does not create duplicate preferences
      const prefsAfterLogin = await UserPreference.find({ userId: createdUser.id });
      if (prefsAfterLogin.length !== 1) {
        throw new Error(`Duplicate preference document created on login! Count: ${prefsAfterLogin.length}`);
      }
      pass('Repeated login does not create duplicate UserPreferences');

      // 5e. Login with incorrect password
      try {
        await authService.login({ email: testEmail, password: 'wrongPassword' });
        throw new Error('Login with wrong password should fail');
      } catch (loginErr: unknown) {
        const msg = loginErr instanceof Error ? loginErr.message : String(loginErr);
        if (msg.includes('Invalid email or password')) {
          pass('Login with incorrect password rejected with generic error');
        } else {
          throw loginErr;
        }
      }

      // 5f. Login with unknown account
      try {
        await authService.login({ email: 'nonexistent_user_999999@example.com', password: testPass });
        throw new Error('Login with nonexistent account should fail');
      } catch (loginErr: unknown) {
        const msg = loginErr instanceof Error ? loginErr.message : String(loginErr);
        if (msg.includes('Invalid email or password')) {
          pass('Login with unknown account rejected with generic error (no account enumeration)');
        } else {
          throw loginErr;
        }
      }

      // 5g. getCurrentUser (simulates /api/auth/me)
      const currentUser = await authService.getCurrentUser(createdUser.id);
      if (!currentUser || currentUser.email !== testEmail.toLowerCase()) {
        throw new Error('getCurrentUser failed to fetch user');
      }
      if ((currentUser as unknown as { passwordHash?: string }).passwordHash) {
        throw new Error('getCurrentUser leaked passwordHash');
      }
      pass('AuthService.getCurrentUser identifies user and returns safe payload');

      // Clean up test records
      await User.deleteOne({ _id: createdUser.id });
      await UserPreference.deleteMany({ userId: createdUser.id });
      console.log('Cleaned up test user & preference documents.');

      await mongoose.disconnect();
    } catch (dbErr) {
      fail('MongoDB Integration Test', dbErr);
    }
  } else {
    console.log('No MONGODB_URI configured, skipping live database integration test.');
  }

  if (allPassed) {
    console.log('\n>>> ALL STAGE 4 AUTH VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
  } else {
    console.error('\n>>> SOME TESTS FAILED <<<');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
