// auth.ts
import NextAuth from 'next-auth'
import {PrismaAdapter} from '@auth/prisma-adapter'
import {db as prisma} from './lib/db'
import authConfig from './auth.config'

export const {handlers, auth, signIn, signOut} = NextAuth({
  adapter: PrismaAdapter(prisma),

  ...authConfig,
  callbacks: {
    async session({session, user}) {
      if (session.user && user) {
        session.user.id = user.id
        session.user.name = user.name
      }
      return session
    },
  },
})
