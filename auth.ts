// auth.ts
import NextAuth from 'next-auth'
import Kakao from 'next-auth/providers/kakao'
import {PrismaAdapter} from '@auth/prisma-adapter'
import {db as prisma} from './lib/db'

export const {handlers, auth, signIn, signOut} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {strategy: 'database'}, // Prisma 쓸 때는 database 방식이 기본입니다.
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      // 중요: 여기서 카카오의 nickname을 name 필드에 연결합니다.
      profile(profile) {
        return {
          id: profile.id.toString(),
          name:
            profile.kakao_account?.profile?.nickname ||
            profile.properties?.nickname,
          email: profile.kakao_account?.email,
          image: profile.kakao_account?.profile?.profile_image_url,
        }
      },
    }),
  ],
  callbacks: {
    async session({session, user}) {
      if (session.user) {
        session.user.id = user.id
        session.user.name = user.name // DB에서 가져온 이름을 세션에 주입
      }
      return session
    },
  },
})
