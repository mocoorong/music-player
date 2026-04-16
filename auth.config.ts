import Kakao from 'next-auth/providers/kakao'
import Google from 'next-auth/providers/google'
import type {NextAuthConfig} from 'next-auth'

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,

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
  session: {strategy: 'jwt'},
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig
