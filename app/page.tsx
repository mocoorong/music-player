'use client'

import {useState, useRef, useEffect} from 'react'
import PlaylistModal from './components/Modal'
import './page.css'
import MusicVar from './components/MusicVar'

export type Song = {
  id: string
  title: string
  youtubeUrl: string
  thumbnail: string
}
export type Playlist = {id: string; title: string; songs: Song[]}

export default function Home() {
  const [play, setPlay] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [playingPlaylistName, setPlayingPlaylistName] = useState<string>('')
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string>('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [modal, setModal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [sleepTime, setSleepTime] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const playerRef = useRef<any>(null)
  const stateRef = useRef({
    playlists,
    playingPlaylistId,
    currentSong,
    isAutoPlay,
  })

  useEffect(() => {
    stateRef.current = {playlists, playingPlaylistId, currentSong, isAutoPlay}
  }, [playlists, playingPlaylistId, currentSong, isAutoPlay])

  const toggleMenu = (menuName: string) =>
    setOpenMenu((prev) => (prev === menuName ? null : menuName))

  const extractVideoId = (url: string) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : ''
  }

  const updatePlaylist = (
    payload: Partial<Playlist> | ((p: Playlist) => Playlist),
    targetId?: string
  ) => {
    const id = targetId || playlists[activeIndex]?.id
    if (!id) return
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const updated =
          typeof payload === 'function' ? payload(p) : {...p, ...payload}
        if (playingPlaylistId === id && (payload as any).title)
          setPlayingPlaylistName((payload as any).title)
        return updated
      })
    )
  }

  const playSpecificSong = (song: Song) => {
    const videoId = extractVideoId(song.youtubeUrl)
    if (!videoId || !playerRef.current) return
    setCurrentSong(song)
    setPlay(true)
    playerRef.current.loadVideoById(videoId)
  }

  const handlePlaySong = (song: Song, playlist: Playlist) => {
    setPlayingPlaylistId(playlist.id)
    setPlayingPlaylistName(playlist.title)
    playSpecificSong(song)
  }

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0) handlePlaySong(playlist.songs[0], playlist)
    else alert('재생할 곡이 없습니다.')
  }

  const handleSkip = (direction: number) => {
    const {playlists, playingPlaylistId, currentSong, isAutoPlay} =
      stateRef.current
    const list = playlists.find((p) => p.id === playingPlaylistId)
    if (!list || list.songs.length === 0) return
    const currentIndex = list.songs.findIndex((s) => s.id === currentSong?.id)
    const nextIndex = currentIndex + direction
    if (nextIndex >= 0 && nextIndex < list.songs.length) {
      playSpecificSong(list.songs[nextIndex])
    } else {
      if (isAutoPlay) {
        const currentListIdx = playlists.findIndex((p) => p.id === list.id)
        const nextListIdx =
          (currentListIdx + direction + playlists.length) % playlists.length
        const nextList = playlists[nextListIdx]
        if (nextList.songs.length > 0) {
          handlePlaySong(
            direction > 0
              ? nextList.songs[0]
              : nextList.songs[nextList.songs.length - 1],
            nextList
          )
          setActiveIndex(nextListIdx)
        }
      } else {
        playSpecificSong(list.songs[direction > 0 ? 0 : list.songs.length - 1])
      }
    }
  }

  const addPlaylist = () => {
    const newTitle =
      playlists.length === 0
        ? '새 플레이리스트'
        : `새 플레이리스트 (${playlists.length})`
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      title: newTitle,
      songs: [],
    }
    const updated = [...playlists, newPlaylist]
    setPlaylists(updated)
    setActiveIndex(updated.length - 1)
    setModal(true)
  }

  const deletePlaylist = (id: string) => {
    if (!confirm('이 플레이 리스트를 삭제하시겠습니까?')) return
    const next = playlists.filter((p) => p.id !== id)
    if (playingPlaylistId === id) {
      setCurrentSong(null)
      setPlay(false)
      setPlayingPlaylistName('')
      setPlayingPlaylistId('')
      playerRef.current?.stopVideo()
    }
    setPlaylists(next)
    setActiveIndex(next.length > 0 ? 0 : -1)
  }

  const scrollToCurrentSong = () => {
    if (!currentSong || !playingPlaylistId) return
    const idx = playlists.findIndex((p) => p.id === playingPlaylistId)
    if (idx === -1) return
    setActiveIndex(idx)
    setModal(true)
    setTimeout(() => {
      const el = document.getElementById(`song-${currentSong.id}`)
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'})
        el.classList.add('highlight-song')
        setTimeout(() => el.classList.remove('highlight-song'), 2000)
      }
    }, 150)
  }

  const exportPlaylists = () => {
    const data = localStorage.getItem('my-playlists')
    if (!data) return alert('백업할 데이터가 없습니다.')
    const blob = new Blob([data], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importPlaylists = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string)
        if (Array.isArray(imported)) {
          setPlaylists(imported)
          localStorage.setItem('my-playlists', JSON.stringify(imported))
          alert('복구 완료!')
        }
      } catch {
        alert('올바른 파일이 아닙니다.')
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    const saved = localStorage.getItem('my-playlists')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPlaylists(parsed)
        if (parsed.length > 0) setActiveIndex(0)
      } catch {}
    }
    setIsMounted(true)
    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document
        .getElementsByTagName('script')[0]
        .parentNode?.insertBefore(
          tag,
          document.getElementsByTagName('script')[0]
        )
    }
    ;(window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {autoplay: 1, rel: 0, controls: 1},
        events: {onStateChange: (e: any) => e.data === 0 && handleSkip(1)},
      })
    }
  }, [])

  useEffect(() => {
    if (isMounted)
      localStorage.setItem('my-playlists', JSON.stringify(playlists))
  }, [playlists, isMounted])
  useEffect(() => {
    if (sleepTime === 0) {
      setPlay(false)
      playerRef.current?.pauseVideo()
      setSleepTime(null)
      setTimeout(() => alert('수면 타이머 종료'), 100)
    }
    if (sleepTime !== null && sleepTime > 0) {
      const t = setInterval(() => setSleepTime((prev) => prev! - 1), 1000)
      return () => clearInterval(t)
    }
  }, [sleepTime])
  useEffect(() => {
    if (playerRef.current?.getPlayerState)
      play ? playerRef.current.playVideo() : playerRef.current.pauseVideo()
  }, [play])

  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const right =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null
  const playbackControls = {
    currentSong,
    playingPlaylistName,
    playingPlaylistId,
    handlePlaySong,
    handleSkip,
    setCurrentSong,
    setPlay,
    play,
    playerRef,
  }

  return (
    <div className="main-bg">
      <div
        className="bg-layer"
        style={{
          backgroundImage: currentSong
            ? `url(${currentSong.thumbnail})`
            : 'none',
        }}
      />

      <div
        className={`youtube-container ${modal ? 'on-modal' : 'hidden-player'}`}
      >
        <div id="yt-player"></div>
        <div className="modal-video-info">
          <p className="modal-video-title">
            {currentSong?.title || '재생 중인 곡이 없습니다'}
          </p>
        </div>
      </div>

      <div className="playlist-zone">
        {left && (
          <div
            className="playlist-album left"
            onClick={() => setActiveIndex(activeIndex - 1)}
          >
            {left.songs[0] ? (
              <img src={left.songs[0].thumbnail} alt="" />
            ) : (
              <div className="no-thumbnail">곡 없음</div>
            )}
          </div>
        )}
        {center && (
          <div className="playlist-album center" onClick={() => setModal(true)}>
            <div className="playlist-album-title">{center.title}</div>
            <img
              src={
                currentSong && playingPlaylistId === center.id
                  ? currentSong.thumbnail
                  : center.songs[0]?.thumbnail
              }
              className={`album-img ${currentSong && playingPlaylistId === center.id ? 'playing' : ''}`}
              alt=""
            />
            {!center.songs[0] && <div className="no-thumbnail">곡 없음</div>}
            <button
              className="album-play-overlay-btn"
              onClick={(e) => {
                e.stopPropagation()
                handlePlayPlaylist(center)
              }}
            >
              <div className="play-icon-inner" />
            </button>
            <button
              className="playlist-delete-anchor"
              onClick={(e) => {
                e.stopPropagation()
                deletePlaylist(center.id)
              }}
            >
              x
            </button>
          </div>
        )}
        {right ? (
          <div
            className="playlist-album right"
            onClick={() => setActiveIndex(activeIndex + 1)}
          >
            {right.songs[0] ? (
              <img src={right.songs[0].thumbnail} alt="" />
            ) : (
              <div className="no-thumbnail">곡 없음</div>
            )}
          </div>
        ) : (
          <div
            className={`music-playlist-add ${playlists.length === 0 ? 'center' : 'right'}`}
            onClick={addPlaylist}
          >
            <div className="plus-btn" />
          </div>
        )}
      </div>

      {center && (
        <PlaylistModal
          isOpen={modal}
          onClose={() => setModal(false)}
          playlist={center}
          updatePlaylist={updatePlaylist}
          {...playbackControls}
        />
      )}

      <div className="icon-container">
        <div className="icon-menu-point">
          <div className="icon-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              className={`autoplay-toggle ${isAutoPlay ? 'on' : 'off'}`}
              onClick={() => toggleMenu('autoplay')}
            >
              🔁
            </button>
            <div
              className={`setting-menu ${openMenu === 'autoplay' ? 'is-open' : ''}`}
            >
              <p className="menu-title">재생 모드 설정</p>
              <div className="menu-options">
                <button
                  className={!isAutoPlay ? 'active' : ''}
                  onClick={() => setIsAutoPlay(false)}
                >
                  현재 리스트 반복
                </button>
                <button
                  className={isAutoPlay ? 'active' : ''}
                  onClick={() => setIsAutoPlay(true)}
                >
                  모든 리스트 재생
                </button>
              </div>
            </div>
          </div>
          <div className="icon-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              className={`timer-btn ${sleepTime !== null ? 'active' : ''}`}
              onClick={() => toggleMenu('timer')}
            >
              ⌛
            </button>
            <div
              className={`setting-menu ${openMenu === 'timer' ? 'is-open' : ''}`}
            >
              <p className="menu-title">수면 타이머 설정</p>
              {sleepTime === null ? (
                <div className="menu-options">
                  <button onClick={() => setSleepTime(15 * 60)}>15분</button>
                  <button onClick={() => setSleepTime(30 * 60)}>30분</button>
                  <button onClick={() => setSleepTime(60 * 60)}>1시간</button>
                  <button onClick={() => setSleepTime(120 * 60)}>2시간</button>
                </div>
              ) : (
                <div className="menu-active">
                  <div className="remaining-time">{`${Math.floor(sleepTime / 60)}:${String(sleepTime % 60).padStart(2, '0')}`}</div>
                  <button
                    className="cancel-btn"
                    onClick={() => setSleepTime(null)}
                  >
                    타이머 취소
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="icon-wrapper" onClick={(e) => e.stopPropagation()}>
            <button
              className="backup-main-btn"
              onClick={() => toggleMenu('backup')}
            >
              💾
            </button>
            <div
              className={`setting-menu ${openMenu === 'backup' ? 'is-open' : ''}`}
            >
              <div className="menu-title">
                <p>데이터 관리</p>
              </div>
              <div className="menu-options">
                <button onClick={exportPlaylists}>데이터 백업 (JSON)</button>
                <label htmlFor="import-file">
                  <div className="menu-button-style">데이터 복구</div>
                </label>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={importPlaylists}
                  style={{display: 'none'}}
                />
              </div>
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
