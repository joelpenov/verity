import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

const ALLOWED_EMAIL = process.env.NEXTAUTH_ALLOWED_EMAIL ?? "";

async function refreshGoogleToken(refreshToken: string): Promise<Partial<JWT>> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const tokens = await res.json();
  if (!res.ok) throw tokens;

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: "openid email profile",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ profile }) {
      return profile?.email === ALLOWED_EMAIL;
    },

    async jwt({ token, account }) {
      // Initial sign-in — store Google tokens
      if (account) {
        return {
          ...token,
          idToken: account.id_token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // Token still valid
      if (Date.now() < (token.expiresAt ?? 0) * 1000) {
        return token;
      }

      // Token expired — refresh
      try {
        const refreshed = await refreshGoogleToken(token.refreshToken!);
        return { ...token, ...refreshed, error: undefined };
      } catch {
        return { ...token, error: "RefreshTokenError" };
      }
    },

    async session({ session, token }) {
      session.idToken = token.idToken;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
