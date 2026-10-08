import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { User, UserPreference } from '../../models/index.js';
import { SafeUserDto, AuthTokenPayload, IUser } from '../../types/index.js';

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

    // 1. Check for existing account with this email
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('An account with this email address already exists.');
      (err as unknown as { status: number }).status = 409;
      throw err;
    }

    // 2. Hash password with bcrypt
    const passwordHash = await this.hashPassword(data.password);

    // 3. Create User document
    const user = await User.create({
      displayName: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    // 4. Create default UserPreference document linked via unique userId
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

    // 5. Generate authentication session token
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

    // 1. Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const err = new Error('Invalid email or password.');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    // 2. Compare password hash
    const isMatch = await this.comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      (err as unknown as { status: number }).status = 401;
      throw err;
    }

    // 3. Ensure UserPreference exists (in case user was created in an earlier test)
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


    // 4. Generate token
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
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }
    return this.toSafeUser(user);
  }
}

// Singleton AuthService instance
export const authService = new AuthService();
