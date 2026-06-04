import {db} from '../lib/db'
import ClientHome from './components/ClientHome'
import {auth, signOut} from '../auth'
import {revalidatePath} from 'next/cache'
import LoginModal from './components/LoginModal'

export default async function Home() {
  const session = await auth()

  if (!session) {
    return <LoginModal />
  }

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
