import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import DiscordProvider from 'next-auth/providers/discord';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '@/types/user';
import * as userStorage from '@/lib/user-storage';
import { syncDiscordProfile } from '@/lib/discord-oauth';
import { checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit-store';
import { logger } from '@/lib/logger';

// SECURITY FIX: Hardcoded admin user removed for production security
// Admin users must be created in the database with secure, unique passwords
// Never hardcode credentials in source code
const DATABASE_CONNECTION_ERROR = 'Database connection error';

/**
 * Conservative in-memory rate-limit fallback. Used only when the persistent
 * (MongoDB-backed) rate-limit store is unavailable, so login stays throttled
 * instead of failing open. Process-local and best-effort.
 */
const memoryRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkMemoryRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    memoryRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= maxRequests;
}

/**
 * Returns true when a JWT should be revoked because the user's password (or
 * other session-version stamp) changed after the token was issued. The token
 * stores the `passwordChangedAt` value that was current at issue time; if the
 * user's current value differs, the token predates the change and is stale.
 */
function isSessionRevoked(tokenPasswordChangedAt: unknown, user: unknown): boolean {
  const userPca = (user as { passwordChangedAt?: string | null } | null)?.passwordChangedAt;
  if (!userPca) return false; // no revocation stamp on the user -> nothing to compare
  return tokenPasswordChangedAt !== userPca;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Discord OAuth Provider
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds.members.read',
        },
      },
    }),
    // Traditional Credentials Provider
    CredentialsProvider({
      name: 'AydoCorp Credentials',
      credentials: {
        aydoHandle: { label: 'AydoCorp Handle', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.aydoHandle || !credentials?.password) {
          return null;
        }

        try {
          // Rate limit login attempts by client IP (MongoDB-backed, persistent)
          const ip =
            (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
          const rateLimitKey = `auth:login:${ip}`;
          try {
            const rateLimit = await checkRateLimit(
              rateLimitKey,
              AUTH_RATE_LIMIT.maxRequests,
              AUTH_RATE_LIMIT.windowMs
            );
            if (!rateLimit.allowed) {
              throw new Error('Too many login attempts. Please try again later.');
            }
          } catch (e) {
            // Re-throw explicit rate-limit errors.
            if (e instanceof Error && e.message.includes('Too many')) throw e;
            // Otherwise the persistent store is down: fail closed via the
            // in-memory fallback so login remains throttled.
            logger.warn('Rate limit check failed, using in-memory fallback limiter', {
              module: 'auth',
              error: e instanceof Error ? e.message : String(e),
            });
            if (
              !checkMemoryRateLimit(
                rateLimitKey,
                AUTH_RATE_LIMIT.maxRequests,
                AUTH_RATE_LIMIT.windowMs
              )
            ) {
              throw new Error('Too many login attempts. Please try again later.');
            }
          }

          let user: User | null = null;

          // Try to find user by handle
          user = await userStorage.getUserByHandle(credentials.aydoHandle);

          if (process.env.NODE_ENV === 'production' && userStorage.isUsingFallbackStorage()) {
            logger.error(
              'Credentials authentication unavailable because user storage is in fallback mode',
              undefined,
              { module: 'auth' }
            );
            throw new Error(DATABASE_CONNECTION_ERROR);
          }

          if (!user) {
            return null;
          }

          // Ensure the user has a passwordHash
          if (!user.passwordHash) {
            logger.error('User missing passwordHash', undefined, {
              module: 'auth',
              aydoHandle: user.aydoHandle,
            });
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.aydoHandle,
            email: user.email,
            clearanceLevel: user.clearanceLevel,
            role: user.role,
            aydoHandle: user.aydoHandle,
            discordName: user.discordName || null,
            rsiAccountName: user.rsiAccountName || null,
            // Revocation claim seed (see jwt callback). Cast: not part of the
            // augmented next-auth User type.
            passwordChangedAt:
              (user as { passwordChangedAt?: string | null }).passwordChangedAt ?? null,
          } as any;
        } catch (error) {
          const authError = error instanceof Error ? error : new Error(String(error));
          logger.error('Authentication error', authError, { module: 'auth' });
          if (authError.message === DATABASE_CONNECTION_ERROR) {
            throw authError;
          }
          throw new Error('Authentication error');
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Discord OAuth sign in
      if (account?.provider === 'discord') {
        try {
          // Sync Discord profile data (roles, division, position)
          const discordProfile = profile as any;
          const discordProfileData = await syncDiscordProfile(
            account.access_token || '',
            user.id,
            discordProfile.username || user.name || 'discord_user'
          );

          // Check if user already exists by Discord ID (primary link key)
          let existingUser = await userStorage.getUserByDiscordId(user.id);

          // Only fall back to an email lookup when we actually have a non-empty
          // email. Previously a blank email (`user.email || ''`) could match an
          // unrelated account with an empty email field and wrongly link/merge
          // Discord identities.
          if (!existingUser && user.email) {
            existingUser = await userStorage.getUserByEmail(user.email);
          }

          if (existingUser) {
            // Discord roles are the source of truth for clearance, but never
            // downgrade an admin via role sync (guards against losing access if
            // a role lookup is incomplete).
            const derivedClearance =
              discordProfileData.clearanceLevel ?? existingUser.clearanceLevel;
            const clearanceLevel =
              existingUser.role === 'admin'
                ? Math.max(existingUser.clearanceLevel, derivedClearance)
                : derivedClearance;

            // Update existing user with Discord info including roles
            await userStorage.updateUser(existingUser.id, {
              discordId: user.id,
              discordName: `${discordProfile.username}#${discordProfile.discriminator}`,
              discordAvatar: user.image || null,
              email: user.email || existingUser.email,
              clearanceLevel,
              division: discordProfileData.division || existingUser.division,
              position: discordProfileData.position || existingUser.position,
              payGrade: discordProfileData.payGrade || existingUser.payGrade,
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Create new user from Discord profile including roles
            const newUser: User = {
              id: crypto.randomUUID(),
              aydoHandle:
                discordProfileData.displayName ||
                discordProfile.username ||
                user.name ||
                'discord_user',
              email: user.email || '',
              passwordHash: null, // SEC-07: null (not empty string) for OAuth users
              clearanceLevel: discordProfileData.clearanceLevel ?? 1,
              role: 'user',
              discordId: user.id,
              discordName: `${discordProfile.username}#${discordProfile.discriminator}`,
              discordAvatar: user.image || null,
              division: discordProfileData.division,
              position: discordProfileData.position,
              payGrade: discordProfileData.payGrade,
              rsiAccountName: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await userStorage.createUser(newUser);
          }
        } catch (error) {
          logger.error(
            'Error handling Discord sign in',
            error instanceof Error ? error : new Error(String(error)),
            { module: 'auth' }
          );
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      const now = Date.now();
      const tokenMaxAge = 60 * 60 * 1000; // 1 hour in milliseconds

      // Initial sign-in
      if (user && account) {
        // For Discord OAuth, fetch the user from storage since the OAuth user object
        // doesn't have our custom properties (clearanceLevel, role, aydoHandle, etc.)
        if (account.provider === 'discord') {
          // User was created/updated in signIn callback, now fetch from storage
          let storedUser = await userStorage.getUserByDiscordId(user.id);
          if (!storedUser && user.email) {
            storedUser = await userStorage.getUserByEmail(user.email);
          }

          if (storedUser) {
            token.id = storedUser.id;
            token.clearanceLevel = storedUser.clearanceLevel;
            token.role = storedUser.role;
            token.aydoHandle = storedUser.aydoHandle;
            token.discordName = storedUser.discordName || null;
            token.discordId = storedUser.discordId || user.id;
            token.discordAvatar = storedUser.discordAvatar || user.image || null;
            token.rsiAccountName = storedUser.rsiAccountName || null;
            (token as any).passwordChangedAt =
              (storedUser as { passwordChangedAt?: string | null }).passwordChangedAt ?? null;
            delete (token as any).error;
            token.lastUpdated = now;
            return token;
          }
          // No verified internal user record exists for this Discord identity.
          // Do NOT fabricate a session from the OAuth profile -- flag the token
          // as invalid so the session callback (and any claim-aware middleware)
          // treats it as unauthenticated.
          logger.error('Discord sign-in produced no internal user record', undefined, {
            module: 'auth',
            discordId: user.id,
          });
          (token as any).error = 'NoUserRecord';
          token.lastUpdated = now;
          return token;
        }

        // For credentials provider, use the user object directly (it has all properties)
        token.id = user.id;
        token.clearanceLevel = user.clearanceLevel;
        token.role = user.role;
        token.aydoHandle = user.aydoHandle;
        token.discordName = user.discordName;
        token.discordId = user.discordId;
        token.discordAvatar = user.discordAvatar;
        token.rsiAccountName = user.rsiAccountName;
        (token as any).passwordChangedAt =
          (user as { passwordChangedAt?: string | null }).passwordChangedAt ?? null;
        delete (token as any).error;
        token.lastUpdated = now;
        return token;
      }

      // A previously-flagged token stays invalid until a fresh sign-in.
      if (token && (token as any).error) {
        return token;
      }

      // If token exists and is not expired, return it
      if (token && now < (token.lastUpdated as number) + tokenMaxAge) {
        return token;
      }

      // If token is expired or needs to be refreshed
      if (token && token.id) {
        try {
          const latestUser = await userStorage.getUserById(token.id as string);
          // A successful read that returns null means the user was deleted or
          // disabled -> invalidate the session (distinct from a thrown
          // connection error, which is handled in catch and must NOT log
          // everyone out on a transient DB blip).
          if (!latestUser) {
            logger.warn('JWT refresh - user no longer exists, invalidating session', {
              module: 'auth',
              userId: token.id,
            });
            (token as any).error = 'NoUserRecord';
            token.lastUpdated = now;
            return token;
          }
          // Revocation claim: if the user's passwordChangedAt advanced after
          // this token was issued, the session predates a password reset.
          if (isSessionRevoked((token as any).passwordChangedAt, latestUser)) {
            logger.info('JWT refresh - session revoked by passwordChangedAt', {
              module: 'auth',
              userId: token.id,
            });
            (token as any).error = 'SessionRevoked';
            token.lastUpdated = now;
            return token;
          }
          token.clearanceLevel = latestUser.clearanceLevel;
          token.role = latestUser.role;
          token.aydoHandle = latestUser.aydoHandle;
          token.discordName = latestUser.discordName || null;
          token.discordId = latestUser.discordId || null;
          token.discordAvatar = latestUser.discordAvatar || null;
          token.rsiAccountName = latestUser.rsiAccountName || null;
          token.lastUpdated = now;
        } catch (e) {
          // Transient storage error: keep the existing (already-issued) token
          // rather than locking users out. Do not advance lastUpdated so the
          // next request retries the refresh.
          logger.warn('JWT callback - failed to refresh user from storage', {
            module: 'auth',
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Reject invalidated tokens (no internal user record, deleted/disabled
      // user, or password-reset revocation). Returning a session without a
      // populated user causes getServerSession-based checks (which require
      // session.user.id) to treat the request as unauthenticated.
      if (!token || (token as any).error || !token.id) {
        return { ...session, user: undefined } as any;
      }

      // Pass token data to the client
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.clearanceLevel = token.clearanceLevel as number;
        session.user.role = token.role as string;
        session.user.aydoHandle = token.aydoHandle as string;
        session.user.discordName = token.discordName as string | null;
        session.user.discordId = token.discordId as string | null;
        session.user.discordAvatar = token.discordAvatar as string | null;
        session.user.rsiAccountName = token.rsiAccountName as string | null;

        // Set display name to AydoCorp handle for consistent display
        session.user.name = token.aydoHandle as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV !== 'production',
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login?error=true',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
