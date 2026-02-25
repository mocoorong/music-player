// app/page.tsx
import {db} from '../lib/db'
import ClientHome from './components/ClientHome'
import {auth, signIn, signOut} from '../auth'
import {revalidatePath} from 'next/cache' // 1. 여기에 추가!

export default async function Home() {
  const session = await auth()

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-6">뮤직 플레이어</h1>
        <form
          action={async () => {
            'use server'
            await signIn('kakao')
          }}
        >
          <button className="bg-[#FEE500] text-black px-6 py-3 rounded-lg font-bold">
            카카오로 시작하기
          </button>
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
      {/* 왼쪽 상단 유저 정보 UI */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          backgroundColor: 'rgba(20, 20, 20, 0.8)',
          padding: '10px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{fontSize: '14px', fontWeight: '600', color: '#fff'}}>
          {session.user?.name}님
        </span>
        <div
          style={{
            width: '1px',
            height: '12px',
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
        <form
          action={async () => {
            'use server'
            await signOut()
          }}
        >
          <button
            style={{
              fontSize: '13px',
              color: '#ff6b6b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontWeight: '500',
            }}
          >
            로그아웃
          </button>
        </form>
      </div>

      {/* addPlaylist 함수를 넘겨줍니다 */}
      <ClientHome
        initialPlaylists={initialPlaylists}
        addPlaylist={addPlaylist}
      />
    </>
  )
}
