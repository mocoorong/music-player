'use client'

import {useRef, useEffect} from 'react'
import Modal from './Modal'
import MusicVar from './MusicVar'
import './../page.css'
import {useMusicPlayer} from '../hooks/useMusicPlayer'
import {addPlaylistAction} from '../actions'

export type Song = {
  id: string
  title: string
  youtubeUrl: string
  thumbnail: string
}
export type Playlist = {id: string; title: string; songs: Song[]}

interface Props {
  initialPlaylists: any[]
  addPlaylist: (title: string) => Promise<void>
}

export default function ClientHome({initialPlaylists}: Props) {
  const {state, actions, playerRef} = useMusicPlayer(initialPlaylists)
  const containerRef = useRef<HTMLDivElement>(null)

  // 클릭 외 영역 닫기 로직
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        state.openMenu &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        actions.setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [state.openMenu])

  // 파일 업로드 및 내보내기 로직 (UI와 밀접하여 내부에 유지하거나 별도 유틸화 가능)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string)
        alert('데이터 전송을 시작합니다.')
        actions.setIsLoading(true)
        actions.setLoadingText('데이터를 DB에 저장중입니다...')
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
        actions.setIsLoading(false)
      }
    }
    reader.readAsText(file)
  }

  const exportToJson = () => {
    if (state.playlists.length === 0)
      return alert('빈 플레이리스트는 공유 불가')
    const dataToExport = state.playlists.map((p) => ({
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
    if (!state.currentSong || !state.playingPlaylistId) return
    const idx = state.playlists.findIndex(
      (p) => p.id === state.playingPlaylistId
    )
    if (idx === -1) return
    actions.setActiveIndex(idx)
    actions.setModal(true)
    setTimeout(() => {
      const el = document.getElementById(`song-${state.currentSong?.id}`)
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'})
        el.classList.add('highlight-song')
        setTimeout(() => el.classList.remove('highlight-song'), 2000)
      }
    }, 150)
  }

  const center =
    state.activeIndex >= 0 ? state.playlists[state.activeIndex] : null
  const left =
    state.activeIndex > 0 ? state.playlists[state.activeIndex - 1] : null
  const right =
    state.activeIndex < state.playlists.length - 1
      ? state.playlists[state.activeIndex + 1]
      : null

  const playbackControls = {
    currentSong: state.currentSong,
    playingPlaylistName: state.playingPlaylistName,
    playingPlaylistId: state.playingPlaylistId,
    handlePlaySong: actions.handlePlaySong,
    handleSkip: actions.handleSkip,
    setCurrentSong: actions.setCurrentSong,
    setPlay: actions.setPlay,
    play: state.play,
    playerRef: {
      current:
        typeof window !== 'undefined' && (window as any).YT?.Player
          ? playerRef.current
          : null,
    },
  }

  return (
    <div className="main-bg">
      {state.isLoading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>{state.loadingText}</p>
        </div>
      )}
      <div
        className="bg-layer"
        style={{
          backgroundImage: state.currentSong
            ? `url(${state.currentSong.thumbnail})`
            : 'none',
        }}
      />

      {/* YouTube Player Section */}
      <div
        className={`youtube-container ${state.modal ? 'on-modal' : 'hidden-player'}`}
      >
        <div className="playlist-title">
          {state.playingPlaylistName
            ? `${state.playingPlaylistName} 재생 중...`
            : ''}
        </div>
        <div id="yt-player"></div>
        <div className="modal-video-info">
          <p className="modal-video-title">
            {state.currentSong?.title || '재생 중인 곡이 없습니다'}
          </p>
        </div>
      </div>

      {/* Playlist Carousel Section */}
      <div className="playlist-zone">
        {left && (
          <div
            className="playlist-album left"
            onClick={() => actions.setActiveIndex(state.activeIndex - 1)}
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
            onClick={() => actions.setModal(true)}
          >
            <div className="album-size">
              <img
                src={
                  state.currentSong && state.playingPlaylistId === center.id
                    ? state.currentSong.thumbnail
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
                  actions.handlePlaySong(center.songs[0], center)
                }
              }}
            >
              <div className="play-icon-inner" />
            </button>
            <button
              className="playlist-delete-anchor"
              onClick={(e) => {
                e.stopPropagation()
                actions.deletePlaylist(center.id)
              }}
            >
              x
            </button>
          </div>
        )}
        {right ? (
          <div
            className="playlist-album right"
            onClick={() => actions.setActiveIndex(state.activeIndex + 1)}
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
            className={`music-playlist-add ${state.playlists.length === 0 ? 'center' : 'right'}`}
            onClick={actions.addPlaylist}
          >
            <div className="plus-btn" />
          </div>
        )}
      </div>

      {center && (
        <Modal
          isOpen={state.modal}
          onClose={() => actions.setModal(false)}
          playlist={center}
          updatePlaylist={actions.updatePlaylist}
          setPlaylists={actions.setPlaylists}
          {...playbackControls}
        />
      )}

      {/* Bottom Icons Section */}
      <div className="icon-container" ref={containerRef}>
        <div className="icon-menu-point">
          <button
            className="shuffle-btn"
            onClick={() => center && actions.shufflePlaylist(center.id)}
          >
            🔀
          </button>

          <button
            className={`autoplay-toggle ${state.isAutoPlay ? 'on' : 'off'}`}
            onClick={() =>
              actions.setOpenMenu((prev) =>
                prev === 'autoplay' ? null : 'autoplay'
              )
            }
          >
            🔁
          </button>
          <div
            className={`setting-menu ${state.openMenu === 'autoplay' ? 'is-open' : ''}`}
          >
            <p className="menu-title">재생 모드 설정</p>
            <div className="menu-options">
              <button
                className={!state.isAutoPlay ? 'active' : ''}
                onClick={() => actions.setIsAutoPlay(false)}
              >
                현재 리스트 반복
              </button>
              <button
                className={state.isAutoPlay ? 'active' : ''}
                onClick={() => actions.setIsAutoPlay(true)}
              >
                모든 리스트 재생
              </button>
            </div>
          </div>

          <button
            className={`timer-btn ${state.sleepTime !== null ? 'active' : ''}`}
            onClick={() =>
              actions.setOpenMenu((prev) => (prev === 'timer' ? null : 'timer'))
            }
          >
            ⌛
          </button>
          <div
            className={`setting-menu ${state.openMenu === 'timer' ? 'is-open' : ''}`}
          >
            <p className="menu-title">수면 타이머 설정</p>
            {state.sleepTime === null ? (
              <div className="menu-options">
                {[15, 30, 60, 120].map((m) => (
                  <button key={m} onClick={() => actions.setSleepTime(m * 60)}>
                    {m === 60 ? '1시간' : m === 120 ? '2시간' : `${m}분`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="menu-active">
                <div className="remaining-time">{`${Math.floor(state.sleepTime / 60)}:${String(state.sleepTime % 60).padStart(2, '0')}`}</div>
                <button
                  className="cancel-btn"
                  onClick={() => actions.setSleepTime(null)}
                >
                  타이머 취소
                </button>
              </div>
            )}
          </div>

          <button
            className="backup-main-btn"
            onClick={() =>
              actions.setOpenMenu((prev) =>
                prev === 'backup' ? null : 'backup'
              )
            }
          >
            💾
          </button>
          <div
            className={`setting-menu ${state.openMenu === 'backup' ? 'is-open' : ''}`}
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
      <MusicVar
        playbackControls={playbackControls}
        scrollToCurrentSong={scrollToCurrentSong}
      />
    </div>
  )
}
