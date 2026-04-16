import {db} from '../lib/db'
import ClientHome from './components/ClientHome'
import {auth, signIn, signOut} from '../auth'
import {revalidatePath} from 'next/cache' // 1. 여기에 추가!

export default async function Home() {
  const session = await auth()

  if (!session) {
    return (
      <div className="login-container">
        <h1 className="login-title">뮤직 플레이어</h1>
        <form
          action={async () => {
            'use server'
            await signIn('kakao')
          }}
        >
          <button className="kakao-login-btn">카카오로 시작하기</button>
        </form>
        <form
          action={async () => {
            'use server'
            await signIn('google')
          }}
        >
          <button className="google-login-btn">구글로 시작하기</button>
        </form>
      </div>
    )
  }

  // 플레이리스트 생성 함수
  async function addPlaylist(title: string) {
    'use server'
    if (!session?.user?.id) return

    await db.playlist.create({
      data: {
        title: title,
        userId: session.user.id,
      },
    })

    revalidatePath('/')
  }

  const initialPlaylists = await db.playlist.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      songs: {
        orderBy: {order: 'asc'},
      },
    },
  })

  return (
    <>
      <div className="user-info-bar">
        <span className="user-name">{session.user?.name}님</span>

        <div className="user-info-divider" />

        <form
          action={async () => {
            'use server'
            await signOut()
          }}
        >
          <button className="logout-btn">로그아웃</button>
        </form>
      </div>

      <ClientHome
        initialPlaylists={initialPlaylists}
        addPlaylist={addPlaylist}
      />
    </>
  )
}
