import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { isAdmin, getPermessi } from "./config"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        const admin = await isAdmin(user.email)
        if (admin) return true
        // Controlla se l'email è presente nella lista Permessi
        const allPermessi = await getPermessi()
        return user.email in allPermessi
      } catch {
        return false
      }
    },
    async session({ session }) {
      return session
    },
  },
}
