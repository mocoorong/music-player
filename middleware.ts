import NextAuth from 'next-auth'
import authConfig from './auth.config'

const {auth} = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  console.log('로그인 여부:', isLoggedIn)
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
