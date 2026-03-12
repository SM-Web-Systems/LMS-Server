import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/backend';

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;

export const clerk = clerkSecretKey
  ? createClerkClient({ secretKey: clerkSecretKey })
  : null;

export async function verifyClerkJWT(token: string) {
  if (!clerkSecretKey) return null;
  try {
    const result = await clerkVerifyToken(token, {
      secretKey: clerkSecretKey,
    });
    return result;
  } catch {
    return null;
  }
}

const clerkUserCache = new Map<string, { email: string; name: string; cachedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getClerkUserInfo(clerkUserId: string): Promise<{ email: string; name: string } | null> {
  if (!clerk) return null;

  const cached = clerkUserCache.get(clerkUserId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return { email: cached.email, name: cached.name };
  }

  try {
    const user = await clerk.users.getUser(clerkUserId);
    const email = user.emailAddresses[0]?.emailAddress;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email?.split('@')[0] || 'User';

    if (!email) return null;

    clerkUserCache.set(clerkUserId, { email, name, cachedAt: Date.now() });
    return { email, name };
  } catch {
    return null;
  }
}
