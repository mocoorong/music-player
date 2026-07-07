'use client'

import Modal from './Modal'
import MusicVar from './MusicVar'
import './../page.css'
import {useMusicPlayer} from '../hooks/useMusicPlayer'
import {usePlayerStore} from '../store/usePlayerStore'
import {addPlaylistAction} from '../actions'
import {useRef, useEffect, useState} from 'react'
import LikedSongsModal from './LikedSongsModal'

interface Props {
  initialPlaylists: any[]
  initialLikedSongs: any[]
  addPlaylist: (title: string) => Promise<void>
}

export type Song = {
  id: string
  title: string
  youtubeUrl: string
  thumbnail: string
}
export type Playlist = {id: string; title: string; songs: Song[]}

export default function ClientHome({
  initialPlaylists,
  initialLikedSongs,
}: Props) {
  useMusicPlayer(initialPlaylists)
  const store = usePlayerStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [likedModalOpen, setLikedModalOpen] = useState(false)

  useEffect(() => {
    store.setLikedSongs(initialLikedSongs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 클릭 외 영역 닫기 로직
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        store.openMenu &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        store.setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [store.openMenu])

  // 파일 업로드 및 내보내기 로직 (UI와 밀접하여 내부에 유지하거나 별도 유틸화 가능)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string)
        alert('데이터 전송을 시작합니다.')
        store.setIsLoading(true)
        store.setLoadingText('데이터를 DB에 저장중입니다...')
        const {addSongBulkAction} = await import('../actions')
        for (const filePlaylist of jsonData) {
          const res = await addPlaylistAction(filePlaylist.title)
          if (res.success && res.data)
            await addSongBulkAction(res.data.id, filePlaylist.songs)
        }
        alert('추가 완료!')
        window.location.reload()
      } catch (error) {
        alert('오류 발생')
      } finally {
        store.setIsLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const exportToJson = () => {
    if (store.playlists.length === 0)
      return alert('빈 플레이리스트는 공유 불가')
    const dataToExport = store.playlists.map((p) => ({
      title: p.title,
      songs: p.songs.map((s) => ({
        title: s.title,
        youtubeUrl: s.youtubeUrl,
        thumbnail: s.thumbnail,
      })),
    }))
    const dataUri =
      'data:application/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(dataToExport, null, 2))
    const link = document.createElement('a')
    link.href = dataUri
    link.download = `backup_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
  }

  const scrollToCurrentSong = () => {
    if (!store.currentSong || !store.playingPlaylistId) return
    const idx = store.playlists.findIndex(
      (p) => p.id === store.playingPlaylistId
    )
    if (idx === -1) return
    store.setActiveIndex(idx)
    store.setModal(true)
    setTimeout(() => {
      const el = document.getElementById(`song-${store.currentSong?.id}`)
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'})
        el.classList.add('highlight-song')
        setTimeout(() => el.classList.remove('highlight-song'), 2000)
      }
    }, 150)
  }

  const center =
    store.activeIndex >= 0 ? store.playlists[store.activeIndex] : null
  const left =
    store.activeIndex > 0 ? store.playlists[store.activeIndex - 1] : null
  const right =
    store.activeIndex < store.playlists.length - 1
      ? store.playlists[store.activeIndex + 1]
      : null

  return (
    <div className="main-bg">
      {store.isLoading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>{store.loadingText}</p>
        </div>
      )}
      <div
        className="bg-layer"
        style={{
          backgroundImage: store.currentSong
            ? `url(${store.currentSong.thumbnail})`
            : 'none',
        }}
      />

      {/* YouTube Player Section */}
      <div
        className={`youtube-container ${store.modal ? 'on-modal' : 'hidden-player'}`}
      >
        <div className="playlist-title">
          {store.playingPlaylistName
            ? `${store.playingPlaylistName} 재생 중...`
            : ''}
        </div>
        <div id="yt-player"></div>
        <div className="modal-video-info">
          <p className="modal-video-title">
            {store.currentSong?.title || '재생 중인 곡이 없습니다'}
          </p>
        </div>
      </div>

      {/* Playlist Carousel Section */}
      <div className="playlist-zone">
        {left && (
          <div
            className="playlist-album left"
            onClick={() => store.setActiveIndex(store.activeIndex - 1)}
          >
            <div className="album-size">
              {left.songs[0] ? (
                <img src={left.songs[0].thumbnail} alt="썸네일" />
              ) : (
                <div className="no-thumbnail"></div>
              )}
            </div>
          </div>
        )}
        {center && (
          <div
            className="playlist-album center"
            onClick={() => {
              setLikedModalOpen(false)
              store.setModal(true)
            }}
          >
            <div className="album-size">
              <img
                src={
                  store.currentSong && store.playingPlaylistId === center.id
                    ? store.currentSong.thumbnail
                    : center.songs[0]?.thumbnail
                }
                alt="썸네일"
              />
            </div>
            <div className="album-title-overlay">{center.title}</div>
            <button
              className={`album-play-overlay-btn ${center.songs.length === 0 ? 'disabled' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                if (center.songs.length > 0) {
                  store.handlePlaySong(center.songs[0], center)
                }
              }}
            >
              <div className="play-icon-inner" />
            </button>
            <button
              className="playlist-delete-anchor"
              onClick={(e) => {
                e.stopPropagation()
                store.deletePlaylist(center.id)
              }}
            >
              x
            </button>
          </div>
        )}
        {right ? (
          <div
            className="playlist-album right"
            onClick={() => store.setActiveIndex(store.activeIndex + 1)}
          >
            <div className="album-size">
              {right.songs[0] ? (
                <img src={right.songs[0].thumbnail} alt="썸네일" />
              ) : (
                <div className="no-thumbnail"></div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`music-playlist-add ${store.playlists.length === 0 ? 'center' : 'right'}`}
            onClick={store.addPlaylist}
          >
            <div className="plus-btn" />
          </div>
        )}
      </div>

      {center && <Modal playlist={center} />}

      <LikedSongsModal
        isOpen={likedModalOpen}
        onClose={() => setLikedModalOpen(false)}
      />

      {/* Bottom Icons Section */}
      <div className="icon-container" ref={containerRef}>
        <div className="icon-menu-point">
          <button
            className="liked-btn"
            onClick={() => {
              store.setModal(false)
              setLikedModalOpen(true)
            }}
          >
            ❤️
          </button>

          <button
            className="shuffle-btn"
            onClick={() => center && store.shufflePlaylist(center.id)}
          >
            🔀
          </button>

          <button
            className={`autoplay-toggle ${store.isAutoPlay ? 'on' : 'off'}`}
            onClick={() =>
              store.setOpenMenu((prev) =>
                prev === 'autoplay' ? null : 'autoplay'
              )
            }
          >
            🔁
          </button>
          <div
            className={`setting-menu ${store.openMenu === 'autoplay' ? 'is-open' : ''}`}
          >
            <p className="menu-title">재생 모드 설정</p>
            <div className="menu-options">
              <button
                className={!store.isAutoPlay ? 'active' : ''}
                onClick={() => store.setIsAutoPlay(false)}
              >
                현재 리스트 반복
              </button>
              <button
                className={store.isAutoPlay ? 'active' : ''}
                onClick={() => store.setIsAutoPlay(true)}
              >
                모든 리스트 재생
              </button>
            </div>
          </div>

          <button
            className={`timer-btn ${store.sleepTime !== null ? 'active' : ''}`}
            onClick={() =>
              store.setOpenMenu((prev) => (prev === 'timer' ? null : 'timer'))
            }
          >
            ⌛
          </button>
          <div
            className={`setting-menu ${store.openMenu === 'timer' ? 'is-open' : ''}`}
          >
            <p className="menu-title">수면 타이머 설정</p>
            {store.sleepTime === null ? (
              <div className="menu-options">
                {[15, 30, 60, 120].map((m) => (
                  <button key={m} onClick={() => store.setSleepTime(m * 60)}>
                    {m === 60 ? '1시간' : m === 120 ? '2시간' : `${m}분`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="menu-active">
                <div className="remaining-time">{`${Math.floor(store.sleepTime / 60)}:${String(store.sleepTime % 60).padStart(2, '0')}`}</div>
                <button
                  className="cancel-btn"
                  onClick={() => store.setSleepTime(null)}
                >
                  타이머 취소
                </button>
              </div>
            )}
          </div>

          <button
            className="backup-main-btn"
            onClick={() =>
              store.setOpenMenu((prev) => (prev === 'backup' ? null : 'backup'))
            }
          >
            💾
          </button>
          <div
            className={`setting-menu ${store.openMenu === 'backup' ? 'is-open' : ''}`}
          >
            <div className="menu-title">
              <p>데이터 관리</p>
            </div>
            <div className="menu-options">
              <input
                type="file"
                accept=".json"
                id="json-upload"
                style={{display: 'none'}}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => document.getElementById('json-upload')?.click()}
              >
                플레이리스트 적용하기
              </button>
              <button onClick={exportToJson}>플레이리스트 공유하기</button>
            </div>
          </div>
        </div>
      </div>
      <MusicVar scrollToCurrentSong={scrollToCurrentSong} />
    </div>
  )
}
