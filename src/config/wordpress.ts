import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const WORDPRESS_JWT_SECRET = process.env.WORDPRESS_JWT_SECRET ?? '';

/**
 * WordPress JWT payload shape (common in WP JWT plugins).
 * Plugins often use JWT_AUTH_SECRET_KEY; set WORDPRESS_JWT_SECRET to the same value.
 */
export interface WordPressJwtPayload {
  sub?: string;           // WP user ID
  user_id?: number;
  email?: string;
  user_email?: string;
  name?: string;
  display_name?: string;
  user_nicename?: string;
  data?: {
    user?: {
      id?: string | number;
      email?: string;
      user_email?: string;
      name?: string;
      display_name?: string;
      user_nicename?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WordPressUserInfo {
  email: string;
  name: string;
  wpUserId?: string;
}

export function isWordPressAuthConfigured(): boolean {
  return WORDPRESS_JWT_SECRET.length > 0;
}

/**
 * Verify a JWT issued by WordPress (e.g. JWT Authentication for WP REST API).
 * Use the same secret as in wp-config.php (JWT_AUTH_SECRET_KEY).
 * Returns user info for find-or-create; throws if invalid.
 */
export function verifyWordPressToken(token: string): WordPressUserInfo {
  if (!WORDPRESS_JWT_SECRET) {
    throw new Error('WordPress JWT is not configured (WORDPRESS_JWT_SECRET)');
  }

  const payload = jwt.verify(token, WORDPRESS_JWT_SECRET) as WordPressJwtPayload;

  // Different WP JWT plugins embed claims differently.
  // In your token, the payload looks like: data.user.id (no email).
  const wpUserId =
    payload.sub ??
    (payload.user_id != null ? String(payload.user_id) : undefined) ??
    (payload.data?.user?.id != null ? String(payload.data.user.id) : undefined);

  const emailFromPayload =
    (payload.email ??
      payload.user_email ??
      payload.data?.user?.email ??
      payload.data?.user?.user_email ??
      '')?.toString().toLowerCase().trim();

  const nameFromPayload =
    (payload.name ??
      payload.display_name ??
      payload.user_nicename ??
      payload.data?.user?.name ??
      payload.data?.user?.display_name ??
      payload.data?.user?.user_nicename ??
      '')?.toString().trim();

  // If the token doesn't include email, we still need a stable way to attach users.
  // We derive a deterministic placeholder email from wpUserId.
  const email =
    emailFromPayload ||
    (wpUserId ? `wordpress_user_${wpUserId}@localwp.invalid` : '');

  if (!email) throw new Error('WordPress JWT missing email and user id claim');

  const name = nameFromPayload || (wpUserId ? `WordPress User ${wpUserId}` : 'User');
  return { email, name, wpUserId };
}
