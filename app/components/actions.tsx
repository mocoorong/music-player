// app/actions.ts
'use server'

import {db} from '../../lib/db'
import {revalidatePath} from 'next/cache'

/**
 * 1. 플레이리스트 추가
 * 새로운 플레이리스트를 생성하고 DB에 저장합니다.
 */
export async function addPlaylistAction(title: string) {
  try {
    const newPlaylist = await db.playlist.create({
      data: {
        id: crypto.randomUUID(), // 고유 ID 생성
        title: title,
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
  try {
    await db.playlist.delete({
      where: {id: id},
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
    const newSong = await db.song.create({
      data: {
        id: crypto.randomUUID(),
        title: title,
        youtubeUrl: url,
        thumbnail: thumbnail,
        playlistId: playlistId, // 외래 키 연결
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

export async function addSongBulkAction(playlistId: string, songs: any[]) {
  try {
    for (const song of songs) {
      await db.song.create({
        data: {
          playlistId,
          title: song.title,
          youtubeUrl: song.youtubeUrl,
          thumbnail: song.thumbnail,
        },
      })
    }
    return {success: true}
  } catch (error) {
    return {success: false}
  }
}
