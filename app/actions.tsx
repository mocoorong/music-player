'use server'

import {db} from '../lib/db'
import {revalidatePath} from 'next/cache'
import {auth} from '../auth'

async function validatePlaylistOwner(playlistId: string) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) throw new Error('로그인이 필요합니다.')

  const playlist = await db.playlist.findFirst({
    where: {
      id: playlistId,
      userId: userId,
    },
  })

  if (!playlist)
    throw new Error('권한이 없거나 플레이리스트를 찾을 수 없습니다.')

  return userId
}

// 1. 플레이리스트 추가
export async function addPlaylistAction(title: string) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) return {success: false, error: '로그인이 필요합니다.'}

  try {
    const newPlaylist = await db.playlist.create({
      data: {
        title: title,
        userId: userId,
      },
      include: {songs: true},
    })
    revalidatePath('/')
    return {success: true, data: newPlaylist}
  } catch (error) {
    return {success: false, error: '플레이리스트 생성 실패'}
  }
}

// 2. 플레이리스트 삭제
export async function deletePlaylistAction(id: string) {
  try {
    const userId = await validatePlaylistOwner(id) // 소유권 확인

    await db.playlist.delete({
      where: {id, userId},
    })

    revalidatePath('/')
    return {success: true}
  } catch (error: any) {
    return {success: false, error: error.message}
  }
}

// 3. 노래 추가 (보안 강화)
export async function addSong(
  playlistId: string,
  title: string,
  url: string,
  thumbnail: string
) {
  try {
    await validatePlaylistOwner(playlistId) // 소유권 확인

    const lastSong = await db.song.findFirst({
      where: {playlistId},
      orderBy: {order: 'desc'},
    })
    const nextOrder = lastSong ? lastSong.order + 1 : 0

    const newSong = await db.song.create({
      data: {
        id: crypto.randomUUID(),
        title,
        youtubeUrl: url,
        thumbnail,
        playlistId,
        order: nextOrder,
      },
    })

    revalidatePath('/')
    return {success: true, song: newSong}
  } catch (error: any) {
    return {success: false, error: error.message}
  }
}

// 4. 노래 삭제 (보안 강화)
export async function deleteSongAction(songId: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return {success: false, error: '로그인이 필요합니다.'}

    // 노래가 속한 플레이리스트의 주인이 나인지 확인
    const song = await db.song.findFirst({
      where: {
        id: songId,
        playlist: {userId: userId}, // Relation 필터를 이용한 소유권 체크
      },
    })

    if (!song) return {success: false, error: '삭제 권한이 없습니다.'}

    await db.song.delete({where: {id: songId}})

    revalidatePath('/')
    return {success: true}
  } catch (error) {
    return {success: false}
  }
}

// 5. 노래 대량 추가 (보안 강화)
export async function addSongBulkAction(playlistId: string, songs: any[]) {
  try {
    await validatePlaylistOwner(playlistId) // 소유권 확인

    // createMany를 사용하여 성능 최적화 (Prisma 권장)
    await db.song.createMany({
      data: songs.map((song, i) => ({
        playlistId,
        title: song.title,
        youtubeUrl: song.youtubeUrl,
        thumbnail: song.thumbnail,
        order: i,
      })),
    })

    revalidatePath('/')
    return {success: true}
  } catch (error: any) {
    return {success: false, error: error.message}
  }
}

// 6. 순서 업데이트 (보안 강화 - 첫 번째 곡 기준 검증)
export async function updateSongOrderAction(
  songs: {id: string; order: number}[]
) {
  if (songs.length === 0) return {success: true}

  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return {success: false}

    // 첫 번째 곡을 통해 해당 플레이리스트 소유권 확인
    const firstSong = await db.song.findFirst({
      where: {id: songs[0].id, playlist: {userId}},
    })
    if (!firstSong) return {success: false, error: '수정 권한이 없습니다.'}

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
    return {success: false}
  }
}
