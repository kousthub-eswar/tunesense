import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { dbState } from '../../config/database.js';
import { User, UserPreference } from '../../models/index.js';
import { SafeUserDto, AuthTokenPayload, IUser } from '../../types/index.js';

// Precomputed dummy bcrypt hash (cost factor 12) for constant-time comparison against nonexistent accounts
const DUMMY_HASH = '$2a$12$e8rG.hG8QhmN6p8xYy1hMe8H5C7.l2WlAeVt3.fC76L7n8vQ0Y3c6';

interface DemoUserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  passwordHash?: string;
  avatarUrl?: string;
  createdAt: string;
}

const DEMO_USERS: Record<string, DemoUserRecord> = {
  'alice@demo.tunesense.ai': {
    id: '64f1a2b3c4d5e6f7a8b9c0d1',
    name: 'Alice Parker',
    email: 'alice@demo.tunesense.ai',
    password: 'DemoPassword123!',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  'bob@demo.tunesense.ai': {
    id: '64f1a2b3c4d5e6f7a8b9c0d2',
    name: 'Bob Martinez',
    email: 'bob@demo.tunesense.ai',
    password: 'DemoPassword123!',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  'charlie@demo.tunesense.ai': {
    id: '64f1a2b3c4d5e6f7a8b9c0d3',
    name: 'Charlie Vance',
    email: 'charlie@demo.tunesense.ai',
    password: 'DemoPassword123!',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  'dana@demo.tunesense.ai': {
    id: '64f1a2b3c4d5e6f7a8b9c0d4',
    name: 'Dana Sterling',
    email: 'dana@demo.tunesense.ai',
    password: 'DemoPassword123!',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
};

// In-memory store for newly registered users during offline/degraded operation
const inMemoryUsersByEmail = new Map<string, DemoUserRecord>();
const inMemoryUsersById = new Map<string, DemoUserRecord>();

export class AuthService {
  private get secret(): string {
    const s = config.jwtSecret || process.env.JWT_SECRET;
    if (!s || s.trim() === '') {
      throw new Error(
        'JWT_SECRET is not configured. Please set JWT_SECRET in server/.env.'
      );
    }
    return s.trim();
  }

  /**
   * Hashes a plaintext password using bcrypt with salt work factor of 12.
   */
  public async hashPassword(plaintext: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(plaintext, salt);
  }

  /**
   * Securely compares plaintext password against stored bcrypt hash.
   */
  public async comparePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Signs a JWT containing minimal user identity (sub: userId).
   */
  public generateToken(userId: string): string {
    const payload: AuthTokenPayload = { sub: userId };
    return jwt.sign(payload, this.secret, {
      expiresIn: (config.jwtExpiresIn || '7d') as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Verifies and decodes a JWT token.
   */
  public verifyToken(token: string): AuthTokenPayload {
    const decoded = jwt.verify(token, this.secret);
    if (!decoded || typeof decoded !== 'object' || !('sub' in decoded)) {
      throw new Error('Invalid authentication token payload.');
    }
    return decoded as AuthTokenPayload;
  }

  /**
   * Converts a Mongoose User document into a safe user representation.
   * Strictly omits passwordHash and internal credentials.
   */
  public toSafeUser(user: IUser): SafeUserDto {
    return {
      id: user._id.toString(),
      name: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt?.toISOString(),
    };
  }

  /**
   * Creates a new user account, hashes password, and creates initial UserPreference document.
   */
  public async signup(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: SafeUserDto; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // 1. Degraded / In-Memory Mode
    if (!dbState.isConnected) {
      if (DEMO_USERS[normalizedEmail] || inMemoryUsersByEmail.has(normalizedEmail)) {
        const err = new Error('An account with this email address already exists.');
        (err as unknown as { status: number }).status = 409;
        throw err;
      }

      const generatedId = `64f1a2b3c4d5e6f7a8b9${Math.random().toString(16).slice(2, 6)}`;
      const passwordHash = await this.hashPassword(data.password);
      const userRecord: DemoUserRecord = {
        id: generatedId,
        name: data.name.trim(),
        email: normalizedEmail,
        password: data.password,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      inMemoryUsersByEmail.set(normalizedEmail, userRecord);
      inMemoryUsersById.set(generatedId, userRecord);

      const token = this.generateToken(generatedId);
      return {
        user: {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          createdAt: userRecord.createdAt,
        },
        token,
      };
    }

    // 2. Connected Database Mode: Check for existing account with this email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('An account with this email address already exists.');
      (err as unknown as { status: number }).status = 409;
      throw err;
    }

    // Hash password with bcrypt
    const passwordHash = await this.hashPassword(data.password);

    // Create User document
    const user = await User.create({
      displayName: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    // Create default UserPreference document linked via unique userId
    try {
      await UserPreference.create({
        userId: user._id,
        favoriteGenres: [],
        preferredGenres: [],
        favoriteArtists: [],
        preferredArtists: [],
        preferredLanguages: ['english'],
        dislikedGenres: [],
        dislikedArtists: [],
        preferredMoods: [],
        personalizationSettings: { explorationLevel: 0.5, diversityLevel: 0.7 },
      });
    } catch (prefErr) {
      // Inconsistency protection: Roll back created user if preference creation fails
      console.error('[AuthService] UserPreference creation failed, rolling back user:', prefErr);
      await User.findByIdAndDelete(user._id);
      throw new Error('Failed to initialize user preferences profile. Please try again.');
    }

    // Generate authentication session token
    const token = this.generateToken(user._id.toString());

    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  /**
   * Authenticates user credentials and returns safe user information and session token.
   */
  public async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: SafeUserDto; token: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const demoUser = DEMO_USERS[normalizedEmail];
    const inMemUser = inMemoryUsersByEmail.get(normalizedEmail);

    // 1. Degraded / Offline Mode (or if user is recognized in in-memory / demo store)
    if (!dbState.isConnected) {
      const targetUser = demoUser || inMemUser;
      if (!targetUser) {
        await this.comparePassword(data.password, DUMMY_HASH);
        const err = new Error('Invalid email or password.');
        (err as unknown as { status: number }).status = 401;
        throw err;
      }

      let passwordValid = false;
      if (targetUser.password === data.password) {
        passwordValid = true;
      } else if (targetUser.passwordHash) {
        passwordValid = await this.comparePassword(data.password, targetUser.passwordHash);
      }

      if (!passwordValid) {
        const err = new Error('Invalid email or password.');
        (err as unknown as { status: number }).status = 401;
        throw err;
      }

      const token = this.generateToken(targetUser.id);
      return {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatarUrl: targetUser.avatarUrl,
          createdAt: targetUser.createdAt,
        },
        token,
      };
    }

    // 2. Connected Database Mode: Attempt finding user in Mongo
    let user = await User.findOne({ email: normalizedEmail });

    // Fallback: If demo user not yet in MongoDB, allow login via demo definition
    if (!user && demoUser) {
      if (data.password !== demoUser.password) {
        const err = new Error('Invalid email or password.');
        (err as unknown as { status: number }).status = 401;
        throw err;
      }
      const token = this.generateToken(demoUser.id);
      return {
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          avatarUrl: demoUser.avatarUrl,
          createdAt: demoUser.createdAt,
        },
        token,
      };
    }

    if (!user) {
      await this.comparePassword(data.password, DUMMY_HASH);
      const err = new Error('Invalid email or password.');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    const isMatch = await this.comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    // Ensure UserPreference exists
    try {
      const existingPref = await UserPreference.findOne({ userId: user._id });
      if (!existingPref) {
        await UserPreference.create({
          userId: user._id,
          favoriteGenres: [],
          preferredGenres: [],
          favoriteArtists: [],
          preferredArtists: [],
          preferredLanguages: ['english'],
          dislikedGenres: [],
          dislikedArtists: [],
          preferredMoods: [],
          personalizationSettings: { explorationLevel: 0.5, diversityLevel: 0.7 },
        });
      }
    } catch (prefErr) {
      console.warn('[AuthService] Could not check or create preferences on login:', prefErr);
    }

    const token = this.generateToken(user._id.toString());
    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  /**
   * Retrieves safe user profile by user ID.
   */
  public async getCurrentUser(userId: string): Promise<SafeUserDto | null> {
    // 1. Check demo catalogue by ID
    const demoUser = Object.values(DEMO_USERS).find((u) => u.id === userId);
    if (demoUser) {
      return {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        avatarUrl: demoUser.avatarUrl,
        createdAt: demoUser.createdAt,
      };
    }

    // 2. Check in-memory store by ID
    const inMemUser = inMemoryUsersById.get(userId);
    if (inMemUser) {
      return {
        id: inMemUser.id,
        name: inMemUser.name,
        email: inMemUser.email,
        avatarUrl: inMemUser.avatarUrl,
        createdAt: inMemUser.createdAt,
      };
    }

    // 3. Check MongoDB if connected
    if (dbState.isConnected) {
      try {
        const user = await User.findById(userId);
        if (user) {
          return this.toSafeUser(user);
        }
      } catch (err) {
        console.warn('[AuthService] Could not retrieve user from MongoDB:', err);
      }
    }

    return null;
  }
}

// Singleton AuthService instance
export const authService = new AuthService();
