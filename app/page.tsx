'use client'

import {useState, useRef, useEffect} from 'react'
import './page.css'
import type {Playlist, Song} from './types/playlist'

export default function Home() {
  const [play, setPlay] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [playingPlaylistName, setPlayingPlaylistName] = useState<string>('')
  const [playTrigger, setPlayTrigger] = useState<number>(0)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [modal, setModal] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const rightAlbum =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null

  // --- 자동 재생 보완 로직 ---
  useEffect(() => {
    let checkInterval: NodeJS.Timeout

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return
      try {
        const data = JSON.parse(event.data)

        // 1. 일반적인 종료 신호(0) 감지
        if (data.event === 'infoDelivery' && data.info?.playerState === 0) {
          handleNextSong()
        }

        // 2. 시간 업데이트 감지 (마지막에 멈추는 현상 방지)
        if (
          data.event === 'infoDelivery' &&
          data.info?.currentTime &&
          data.info?.duration
        ) {
          const {currentTime, duration} = data.info
          // 영상 종료 0.5초~1초 전에 강제로 다음 곡 트리거
          if (duration > 0 && currentTime >= duration - 1) {
            handleNextSong()
          }
        }
      } catch (e) {}
    }

    // 3. YouTube에 지속적으로 상태를 요청 (데이터를 보내달라고 찌르는 역할)
    if (play && currentSong) {
      checkInterval = setInterval(() => {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({event: 'listening', id: 1, args: []}),
          '*'
        )
      }, 1000)
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
      clearInterval(checkInterval)
    }
  }, [play, currentSong, playlists, playingPlaylistName])

  const extractVideoId = (url: string) => {
    if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0]
    if (url.includes('youtu.be/'))
      return url.split('youtu.be/')[1].split('?')[0]
    return ''
  }

  const sendYoutubeCommand = (command: 'playVideo' | 'pauseVideo') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({event: 'command', func: command, args: []}),
      '*'
    )
  }

  useEffect(() => {
    sendYoutubeCommand(play ? 'playVideo' : 'pauseVideo')
  }, [play])

  const handlePlaySong = (song: Song, playlistTitle: string) => {
    setCurrentSong(song)
    setPlay(true)
    setPlayingPlaylistName(playlistTitle)
    setPlayTrigger(Date.now())
  }

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0)
      handlePlaySong(playlist.songs[0], playlist.title)
    else alert('재생할 곡이 없습니다.')
  }

  const handleNextSong = () => {
    if (!currentSong || !playingPlaylistName) return
    const currentPlaylist = playlists.find(
      (p) => p.title === playingPlaylistName
    )
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return
    const idx = currentPlaylist.songs.findIndex((s) => s.id === currentSong.id)
    const nextIdx = (idx + 1) % currentPlaylist.songs.length
    handlePlaySong(currentPlaylist.songs[nextIdx], currentPlaylist.title)
  }

  const handlePrevSong = () => {
    if (!currentSong || !playingPlaylistName) return
    const currentPlaylist = playlists.find(
      (p) => p.title === playingPlaylistName
    )
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return
    const idx = currentPlaylist.songs.findIndex((s) => s.id === currentSong.id)
    const prevIdx =
      (idx - 1 + currentPlaylist.songs.length) % currentPlaylist.songs.length
    handlePlaySong(currentPlaylist.songs[prevIdx], currentPlaylist.title)
  }

  // ... (addPlaylist, deletePlaylist, handleTitleUpdate, updateCurrentPlaylist, addSong, moveSong 로직은 이전과 동일)
  const addPlaylist = () => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      title: '새 플레이리스트',
      songs: [],
    }
    const updated = [...playlists, newPlaylist]
    setPlaylists(updated)
    setActiveIndex(updated.length - 1)
    setModal(true)
  }

  const deletePlaylist = (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    const next = playlists.filter((p) => p.id !== id)
    if (center?.id === id && center?.title === playingPlaylistName) {
      setCurrentSong(null)
      setPlay(false)
      setPlayingPlaylistName('')
    }
    setPlaylists(next)
    setActiveIndex(next.length > 0 ? 0 : -1)
    setModal(false)
  }

  const handleTitleUpdate = () => {
    if (!center) return
    const newTitle = tempTitle.trim() || '제목 없음'
    setPlaylists((prev) =>
      prev.map((p) => (p.id === center.id ? {...p, title: newTitle} : p))
    )
    if (playingPlaylistName === center.title) setPlayingPlaylistName(newTitle)
    setIsEditingTitle(false)
  }

  const updateCurrentPlaylist = (updated: Playlist) => {
    setPlaylists(playlists.map((p) => (p.id === updated.id ? updated : p)))
  }

  const addSong = async () => {
    if (!youtubeUrl.trim() || !center) return
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) return alert('유효한 링크가 아닙니다.')
    try {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      )
      const data = await res.json()
      const newSong: Song = {
        id: Date.now().toString(),
        title: data.title || '제목 없음',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        youtubeUrl,
      }
      updateCurrentPlaylist({...center, songs: [...center.songs, newSong]})
      setYoutubeUrl('')
    } catch (e) {
      alert('정보를 가져오지 못했습니다.')
    }
  }

  const moveSong = (index: number, direction: 'up' | 'down') => {
    if (!center) return
    const newSongs = [...center.songs]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newSongs.length) return
    ;[newSongs[index], newSongs[target]] = [newSongs[target], newSongs[index]]
    updateCurrentPlaylist({...center, songs: newSongs})
  }

  return (
    <div className="main-bg">
      <div
        className={`youtube-container ${modal ? 'on-modal' : 'hidden-player'}`}
      >
        {currentSong && (
          <iframe
            key={playTrigger}
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${extractVideoId(currentSong.youtubeUrl)}?enablejsapi=1&autoplay=1&controls=1&rel=0&modestbranding=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
            allow="autoplay"
            frameBorder="0"
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
                {playingPlaylistName ? `${playingPlaylistName} 재생 중...` : ''}
              </div>
              <div className="video-placeholder" />
              <div className="modal-video-info">
                <p className="modal-video-title">{currentSong?.title || ''}</p>
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
                    onClick={() => handlePlaySong(song, center.title)}
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
                        onClick={() =>
                          updateCurrentPlaylist({
                            ...center,
                            songs: center.songs.filter((s) => s.id !== song.id),
                          })
                        }
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
