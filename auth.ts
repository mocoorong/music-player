import NextAuth from 'next-auth'
import {PrismaAdapter} from '@auth/prisma-adapter'
import {db as prisma} from './lib/db'
import authConfig from './auth.config'

export const {handlers, auth, signIn, signOut} = NextAuth({
  adapter: PrismaAdapter(prisma),

  ...authConfig,
  callbacks: {
    async jwt({token, user}) {
      // 로그인 시점에 user 객체가 있으면 token에 id를 저장
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({session, token}) {
      // token에 저장된 id를 세션으로 옮김
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
