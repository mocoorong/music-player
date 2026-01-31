'use client'

import {useState, useRef, useEffect} from 'react'
import './page.css'
import type {Playlist, Song} from './types/playlist'

export default function Home() {
  // --- 상태 관리 ---
  const [play, setPlay] = useState(false)
  const [modal, setModal] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)

  // 모달 내부용 임시 상태
  const [tempTitle, setTempTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 슬라이드 인덱스 계산
  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const rightAlbum =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null

  // --- 유튜브 유틸리티 ---
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

  // --- 플레이리스트 로직 ---
  const addPlaylist = () => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      title: '새 플레이리스트',
      songs: [],
    }
    const updatedPlaylists = [...playlists, newPlaylist]
    setPlaylists(updatedPlaylists)
    setActiveIndex(updatedPlaylists.length - 1) // 새로 만든 앨범으로 포커스
    setModal(true)
  }

  const deletePlaylist = (id: string) => {
    if (!confirm('플레이리스트를 삭제하시겠습니까?')) return
    const next = playlists.filter((p) => p.id !== id)
    setPlaylists(next)
    setActiveIndex(next.length > 0 ? 0 : -1)
    setCurrentSong(null)
    setPlay(false)
    setModal(false)
  }

  const updateCurrentPlaylist = (updated: Playlist) => {
    setPlaylists(playlists.map((p) => (p.id === updated.id ? updated : p)))
  }

  // --- 곡 관련 로직 ---
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

      const updated = {...center, songs: [...center.songs, newSong]}
      updateCurrentPlaylist(updated)

      // 첫 곡이면 자동 재생
      if (updated.songs.length === 1) {
        setCurrentSong(newSong)
        setPlay(true)
      }
      setYoutubeUrl('')
    } catch (e) {
      alert('곡 정보를 가져오지 못했습니다.')
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
      {/* 유튜브 플레이어: currentSong이 있을 때만 렌더링하여 src="" 에러 방지 */}
      <div
        className={`youtube-container ${modal ? 'on-modal' : 'hidden-player'}`}
      >
        {currentSong && (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${extractVideoId(currentSong.youtubeUrl)}?enablejsapi=1&autoplay=1&controls=0`}
            allow="autoplay"
            frameBorder="0"
          />
        )}
      </div>

      {/* 메인 화면 레이아웃 */}
      <div className="playlist-zone">
        {center && <div className="playlist-album-title">{center.title}</div>}

        {/* 왼쪽 앨범 */}
        {left && (
          <div
            className="playlist-album left"
            onClick={() => setActiveIndex(activeIndex - 1)}
          >
            {left.songs[0]?.thumbnail ? (
              <img src={left.songs[0].thumbnail} alt="left" />
            ) : (
              <div className="no-thumbnail">곡 없음</div>
            )}
          </div>
        )}

        {/* 중앙 앨범 */}
        {center && (
          <div className="playlist-album center" onClick={() => setModal(true)}>
            <div className="playlist-album-cover">
              {center.songs[0]?.thumbnail ? (
                <img src={center.songs[0].thumbnail} alt="center" />
              ) : (
                <div className="no-thumbnail">곡을 추가해 주세요</div>
              )}
            </div>
          </div>
        )}

        {/* 오른쪽 앨범 혹은 추가 버튼 */}
        {rightAlbum ? (
          <div
            className="playlist-album right"
            onClick={() => setActiveIndex(activeIndex + 1)}
          >
            {rightAlbum.songs[0]?.thumbnail ? (
              <img src={rightAlbum.songs[0].thumbnail} alt="right" />
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

      {/* 통합 모달창 */}
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
                      onBlur={() => {
                        updateCurrentPlaylist({
                          ...center,
                          title: tempTitle || '제목 없음',
                        })
                        setIsEditingTitle(false)
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        (e.currentTarget as HTMLInputElement).blur()
                      }
                    />
                  ) : (
                    <p
                      className="modal-title-display"
                      onClick={() => {
                        setTempTitle(center.title)
                        setIsEditingTitle(true)
                      }}
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
                    onClick={() => {
                      setCurrentSong(song)
                      setPlay(true)
                    }}
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

      {/* 하단 재생 바 */}
      <div className="music-var">
        <div className="music-var-title">
          {currentSong?.title || '플레이 리스트를 선택해주세요'}
        </div>
        <div className="control-btns">
          <button>
            <img src="/img/main-prevBtn.png" alt="prev" />
          </button>
          <button onClick={() => setPlay(!play)}>
            <img
              src={play ? '/img/main-pauseBtn.png' : '/img/main-playBtn.png'}
              alt="play"
            />
          </button>
          <button>
            <img src="/img/main-nextBtn.png" alt="next" />
          </button>
        </div>
      </div>
    </div>
  )
}
