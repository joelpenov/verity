import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protect everything except the login page and NextAuth API routes
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
