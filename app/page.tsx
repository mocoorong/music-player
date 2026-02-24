// app/page.tsx
import {db} from '../lib/db'
import ClientHome from './components/ClientHome'

export default async function Home() {
  // 1. 서버에서 DB에 저장된 모든 플레이리스트와 노래를 가져옵니다.
  const initialPlaylists = await db.playlist.findMany({
    include: {
      songs: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  })

  // 2. 클라이언트 컴포넌트에 데이터를 전달합니다.
  return <ClientHome initialPlaylists={initialPlaylists} />
}
