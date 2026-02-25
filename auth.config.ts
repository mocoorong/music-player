// auth.config.ts
import Kakao from 'next-auth/providers/kakao'
import type {NextAuthConfig} from 'next-auth'

export default {
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    }),
  ],
} satisfies NextAuthConfig
