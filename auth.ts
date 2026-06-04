import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import {PrismaAdapter} from '@auth/prisma-adapter'
import {db as prisma} from './lib/db'
import authConfig from './auth.config'
import bcrypt from 'bcryptjs'

export const {handlers, auth, signIn, signOut} = NextAuth({
  adapter: PrismaAdapter(prisma),

  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(Credentials) {
        const email = String(Credentials?.email ?? '')
          .trim()
          .toLowerCase()
        const password = String(Credentials?.password ?? '')
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: {email},
        })
        if (!user?.passwordHash) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({session, token}) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
