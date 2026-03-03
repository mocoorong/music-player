'use server'

import {db} from '../../lib/db'
import {revalidatePath} from 'next/cache'
import {auth} from '../../auth'
/**
 * 1. 플레이리스트 추가
 * 새로운 플레이리스트를 생성하고 DB에 저장합니다.
 */
export async function addPlaylistAction(title: string) {
  const session = await auth()
  const userId = session?.user?.id

  // 2. 로그인이 안 되어 있으면 중단
  if (!userId) {
    return {success: false, error: '로그인이 필요합니다.'}
  }
  try {
    const newPlaylist = await db.playlist.create({
      data: {
        id: crypto.randomUUID(),
        title: title,
        user: {
          connect: {id: userId}, // 또는 session.user.id 등
        },
      },
      include: {
        songs: true, // 빈 노래 배열을 포함하여 반환
      },
    })

    // 페이지 데이터 갱신 (새로고침 없이 화면 업데이트)
    revalidatePath('/')
    return {success: true, data: newPlaylist}
  } catch (error) {
    console.error('플레이리스트 추가 실패:', error)
    return {success: false, error: '플레이리스트를 생성할 수 없습니다.'}
  }
}

/**
 * 2. 플레이리스트 삭제
 * 특정 플레이리스트와 그 안에 포함된 모든 노래를 DB에서 삭제합니다.
 */
export async function deletePlaylistAction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return {success: false}
  try {
    await db.playlist.delete({
      where: {
        id: id,
        userId: session.user.id, // '내 아이디가 작성자인 것만' 삭제하라는 조건 추가
      },
    })

    revalidatePath('/')
    return {success: true}
  } catch (error) {
    console.error('플레이리스트 삭제 실패:', error)
    return {success: false, error: '삭제 중 오류가 발생했습니다.'}
  }
}

/**
 * 3. 노래 추가
 * 특정 플레이리스트 내에 새로운 노래 정보를 저장합니다.
 */
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

/**
 * 4. 노래 삭제 (필요할 경우를 대비해 추가)
 * 플레이리스트 내의 특정 노래만 삭제합니다.
 */
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

// 각 플레이리스트별 전체 노래 추가
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
