'use server'

import {db} from '../lib/db'
import {revalidatePath} from 'next/cache'
import {auth} from '../auth'

export async function addPlaylistAction(title: string) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return {success: false, error: '로그인이 필요합니다.'}
  }
  try {
    const newPlaylist = await db.playlist.create({
      data: {
        id: crypto.randomUUID(),
        title: title,
        user: {
          connect: {id: userId},
        },
      },
      include: {
        songs: true,
      },
    })

    revalidatePath('/')
    return {success: true, data: newPlaylist}
  } catch (error) {
    console.error('플레이리스트 추가 실패:', error)
    return {success: false, error: '플레이리스트를 생성할 수 없습니다.'}
  }
}

export async function deletePlaylistAction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return {success: false}
  try {
    await db.playlist.delete({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    revalidatePath('/')
    return {success: true}
  } catch (error) {
    console.error('플레이리스트 삭제 실패:', error)
    return {success: false, error: '삭제 중 오류가 발생했습니다.'}
  }
}

export async function addSong(
  playlistId: string,
  title: string,
  url: string,
  thumbnail: string
) {
  try {
    const lastSong = await db.song.findFirst({
      where: {playlistId},
      orderBy: {order: 'desc'}, // 가장 큰 번호 찾기
    })
    const nextOrder = lastSong ? lastSong.order + 1 : 0

    const newSong = await db.song.create({
      data: {
        id: crypto.randomUUID(),
        title: title,
        youtubeUrl: url,
        thumbnail: thumbnail,
        playlistId: playlistId,
        order: nextOrder,
      },
    })

    revalidatePath('/')
    return {success: true, song: newSong}
  } catch (error) {
    console.error('노래 추가 실패:', error)
    return {success: false, error: '노래를 저장할 수 없습니다.'}
  }
}

export async function deleteSongAction(songId: string) {
  try {
    await db.song.delete({
      where: {id: songId},
    })

    revalidatePath('/')
    return {success: true}
  } catch (error) {
    console.error('노래 삭제 실패:', error)
    return {success: false}
  }
}

export async function addSongBulkAction(playlistId: string, songs: any[]) {
  try {
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i]
      await db.song.create({
        data: {
          playlistId,
          title: song.title,
          youtubeUrl: song.youtubeUrl,
          thumbnail: song.thumbnail,
          order: i,
        },
      })
    }
    return {success: true}
  } catch (error) {
    return {success: false}
  }
}

export async function updateSongOrderAction(
  songs: {id: string; order: number}[]
) {
  try {
    await db.$transaction(
      songs.map((song) =>
        db.song.update({
          where: {id: song.id},
          data: {order: song.order},
        })
      )
    )
    return {success: true}
  } catch (error) {
    console.error('순서 업데이트 에러:', error)
    return {success: false}
  }
}
