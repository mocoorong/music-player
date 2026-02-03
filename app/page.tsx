'use client'

import {useState, useRef, useEffect} from 'react'
import './page.css'

export type Song = {
  id: string
  title: string
  youtubeUrl: string
  thumbnail: string
}
export type Playlist = {
  id: string
  title: string
  songs: Song[]
}

export default function Home() {
  const [play, setPlay] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [playingPlaylistName, setPlayingPlaylistName] = useState<string>('')
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string>('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [modal, setModal] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [origin, setOrigin] = useState('')

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 리스너 내부용 최신 상태 참조 Ref
  const playlistsRef = useRef(playlists)
  const playingPlaylistIdRef = useRef(playingPlaylistId)

  useEffect(() => {
    playlistsRef.current = playlists
    playingPlaylistIdRef.current = playingPlaylistId
  }, [playlists, playingPlaylistId])

  // 1. 초기 로드 및 하이드레이션 방지
  useEffect(() => {
    const savedPlaylists = localStorage.getItem('my-playlists')
    if (savedPlaylists) {
      try {
        const parsed = JSON.parse(savedPlaylists)
        setPlaylists(parsed)
        if (parsed.length > 0) setActiveIndex(0)
      } catch (e) {
        console.error(e)
      }
    }
    setOrigin(window.location.origin)
    setIsMounted(true)
  }, [])

  // 2. 데이터 저장
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('my-playlists', JSON.stringify(playlists))
    }
  }, [playlists, isMounted])

  const extractVideoId = (url: string) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : ''
  }

  const sendYoutubeCommand = (func: string, args: any[] = []) => {
    if (!iframeRef.current?.contentWindow) return
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({event: 'command', func, args}),
      '*'
    )
  }

  useEffect(() => {
    sendYoutubeCommand(play ? 'playVideo' : 'pauseVideo')
  }, [play])

  // 3. 자동 곡 변경 감지 (가장 중요한 부분)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube')) return

      let data
      try {
        data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }

      if (data.event !== 'infoDelivery') return
      console.log('YT DATA:', data)
      const index =
        typeof data.info?.playlistIndex === 'number'
          ? data.info.playlistIndex
          : typeof data.info?.currentIndex === 'number'
            ? data.info.currentIndex
            : null

      if (index === null) return

      const list = playlistsRef.current.find(
        (p) => p.id === playingPlaylistIdRef.current
      )

      if (!list) return

      const nextSong = list.songs[index]
      if (!nextSong) return

      setCurrentSong({
        ...nextSong,
      })
    }
    window.addEventListener('message', handleMessage)

    const interval = setInterval(() => {
      sendYoutubeCommand('getPlaylistIndex')
    }, 700)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(interval)
    }
  }, [])

  const handlePlaySong = (song: Song, playlist: Playlist) => {
    const videoIds = playlist.songs
      .map((s) => extractVideoId(s.youtubeUrl))
      .filter((id) => id !== '')
    const targetIndex = playlist.songs.findIndex((s) => s.id === song.id)

    setPlayingPlaylistId(playlist.id)
    setPlayingPlaylistName(playlist.title)
    setCurrentSong(song)
    setPlay(true)

    sendYoutubeCommand('loadPlaylist', [videoIds, targetIndex, 0])
  }

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0) handlePlaySong(playlist.songs[0], playlist)
    else alert('재생할 곡이 없습니다.')
  }

  const handleNextSong = () => sendYoutubeCommand('nextVideo')
  const handlePrevSong = () => sendYoutubeCommand('previousVideo')

  const addPlaylist = () => {
    const count = playlists.length
    const newTitle =
      count === 0 ? '새 플레이리스트' : `새 플레이리스트 (${count})`
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      title: newTitle,
      songs: [],
    }
    const updated = [...playlists, newPlaylist]
    setPlaylists(updated)
    setActiveIndex(updated.length - 1)
    setModal(true)
    setTempTitle(newTitle)
  }

  const deletePlaylist = (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    const next = playlists.filter((p) => p.id !== id)
    if (playingPlaylistId === id) {
      setCurrentSong(null)
      setPlay(false)
      setPlayingPlaylistName('')
      setPlayingPlaylistId('')
    }
    setPlaylists(next)
    setActiveIndex(next.length > 0 ? 0 : -1)
    setModal(false)
  }

  const handleTitleUpdate = () => {
    const currentActive = playlists[activeIndex]
    if (!currentActive) return
    const newTitle = tempTitle.trim() || '제목 없음'
    setPlaylists((prev) =>
      prev.map((p) => (p.id === currentActive.id ? {...p, title: newTitle} : p))
    )
    if (playingPlaylistId === currentActive.id) setPlayingPlaylistName(newTitle)
    setIsEditingTitle(false)
  }

  const addSong = async () => {
    const currentActive = playlists[activeIndex]
    if (!youtubeUrl.trim() || !currentActive) return
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) return alert('유효한 링크가 아닙니다.')
    try {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      )
      const data = await res.json()
      const newSong: Song = {
        id: crypto.randomUUID(),
        title: data.title || '제목 없음',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        youtubeUrl,
      }
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === currentActive.id ? {...p, songs: [...p.songs, newSong]} : p
        )
      )
      setYoutubeUrl('')
    } catch (e) {
      alert('정보를 가져오지 못했습니다.')
    }
  }

  const moveSong = (index: number, direction: 'up' | 'down') => {
    const currentActive = playlists[activeIndex]
    if (!currentActive) return
    const newSongs = [...currentActive.songs]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newSongs.length) return
    ;[newSongs[index], newSongs[target]] = [newSongs[target], newSongs[index]]
    setPlaylists((prev) =>
      prev.map((p) => (p.id === currentActive.id ? {...p, songs: newSongs} : p))
    )
    if (currentActive.id === playingPlaylistIdRef.current && currentSong) {
      const videoIds = newSongs
        .map((s) => extractVideoId(s.youtubeUrl))
        .filter(Boolean)

      // 현재 재생곡 위치 다시 계산
      const newIndex = newSongs.findIndex((s) => s.id === currentSong.id)

      sendYoutubeCommand('loadPlaylist', [
        videoIds,
        newIndex === -1 ? 0 : newIndex,
        0,
      ])
    }
  }

  // ★ 렌더링 직전에 변수들을 정의하여 ReferenceError 방지 ★
  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const rightAlbum =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null

  return (
    <div className="main-bg">
      <div
        className={`youtube-container ${modal ? 'on-modal' : 'hidden-player'}`}
      >
        {origin && (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed?enablejsapi=1&origin=${origin}`}
            allow="autoplay; encrypted-media"
            frameBorder="0"
            onLoad={() => {
              if (!iframeRef.current?.contentWindow) return

              // ★ 이게 핵심
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({event: 'listening'}),
                '*'
              )
            }}
          />
        )}
      </div>

      <div className="playlist-zone">
        {center && <div className="playlist-album-title">{center.title}</div>}
        {left && (
          <div
            className="playlist-album left"
            onClick={() => setActiveIndex(activeIndex - 1)}
          >
            {left.songs[0]?.thumbnail ? (
              <img src={left.songs[0].thumbnail} alt="" />
            ) : (
              <div className="no-thumbnail">곡 없음</div>
            )}
          </div>
        )}
        {center && (
          <div className="playlist-album center" onClick={() => setModal(true)}>
            <div className="playlist-album-cover">
              {center.songs[0]?.thumbnail ? (
                <img src={center.songs[0].thumbnail} alt="" />
              ) : (
                <div className="no-thumbnail">곡 없음</div>
              )}
              <button
                className="album-play-overlay-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlayPlaylist(center)
                }}
              >
                <div className="play-icon-inner" />
              </button>
            </div>
          </div>
        )}
        {rightAlbum ? (
          <div
            className="playlist-album right"
            onClick={() => setActiveIndex(activeIndex + 1)}
          >
            {rightAlbum.songs[0]?.thumbnail ? (
              <img src={rightAlbum.songs[0].thumbnail} alt="" />
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

      {modal && center && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button
              className="playlist-delete-anchor"
              onClick={() => deletePlaylist(center.id)}
            >
              삭제
            </button>
            <div className="modal-inner-left">
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  zIndex: 10,
                }}
              >
                {playingPlaylistName && playingPlaylistId === center.id
                  ? `${playingPlaylistName} 재생 중...`
                  : ''}
              </div>
              <div className="video-placeholder" />
              <div className="modal-video-info">
                <p className="modal-video-title">
                  {currentSong?.title || '재생 중인 곡이 없습니다'}
                </p>
              </div>
            </div>
            <div className="modal-inner-right">
              <div className="modal-inner-title">
                <div className="title-edit-zone">
                  {isEditingTitle ? (
                    <input
                      autoFocus
                      className="title-inline-input"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={handleTitleUpdate}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleTitleUpdate()
                      }
                    />
                  ) : (
                    <p
                      className="modal-title-display"
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {center.title} ✎
                    </p>
                  )}
                </div>
                <div className="options">
                  <input
                    placeholder="유튜브 링크"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSong()}
                  />
                  <button onClick={addSong}>+</button>
                </div>
              </div>
              <div className="modal-inner-list">
                {center.songs.length === 0 && (
                  <div className="no-songs-msg">곡을 추가해주세요.</div>
                )}
                {center.songs.map((song, i) => (
                  <div
                    key={song.id}
                    className="song-item"
                    onClick={() => handlePlaySong(song, center)}
                  >
                    <div className="song-info">
                      <img
                        src={song.thumbnail}
                        className="song-thumbnail"
                        alt=""
                      />
                      <span className="song-title-text">{song.title}</span>
                    </div>
                    <div
                      className="song-controls"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button onClick={() => moveSong(i, 'up')}>▲</button>
                      <button onClick={() => moveSong(i, 'down')}>▼</button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const updatedSongs = center.songs.filter(
                            (s) => s.id !== song.id
                          )
                          setPlaylists(
                            playlists.map((p) =>
                              p.id === center.id
                                ? {...center, songs: updatedSongs}
                                : p
                            )
                          )
                        }}
                      >
                        X
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="music-var">
        <div className="music-var-title">
          {playingPlaylistName ? `[${playingPlaylistName}] ` : ''}
          {currentSong?.title || '플레이 리스트를 선택해주세요'}
        </div>
        <div className="control-btns">
          <button onClick={handlePrevSong}>
            <img src="/img/main-prevBtn.png" alt="prev" />
          </button>
          <button onClick={() => setPlay(!play)}>
            <img
              src={play ? '/img/main-pauseBtn.png' : '/img/main-playBtn.png'}
              alt="play"
            />
          </button>
          <button onClick={handleNextSong}>
            <img src="/img/main-nextBtn.png" alt="next" />
          </button>
        </div>
      </div>
    </div>
  )
}
