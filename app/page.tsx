'use client'

import {useState, useRef, useEffect} from 'react'
import './page.css'

// ─── [SECTION 1] 타입 정의 ───
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
  // ─── [SECTION 2] 상태(State) 선언 ───
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('search')
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  const [sleepTime, setSleepTime] = useState<number | null>(null)

  // ─── [SECTION 3] 참조(Ref) 관리 ───
  // 유튜브 플레이어 객체 Ref
  const playerRef = useRef<any>(null)

  // 최신 상태들을 하나로 통합한 Ref (이벤트 핸들러에서 최신 상태 참조용)
  const stateRef = useRef({
    playlists,
    playingPlaylistId,
    currentSong,
    isAutoPlay,
  })

  // 상태가 변경될 때마다 Ref를 동기화
  useEffect(() => {
    stateRef.current = {playlists, playingPlaylistId, currentSong, isAutoPlay}
  }, [playlists, playingPlaylistId, currentSong, isAutoPlay])

  // ─── [SECTION 4] 초기 로드 및 유튜브 API 설정 ───
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
    setIsMounted(true)

    if (!(window as any).YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    ;(window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {
          autoplay: 1,
          rel: 0,
          controls: 1,
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === 0) {
              // YT.PlayerState.ENDED
              handleNextSong()
            }
          },
        },
      })
    }
  }, [])

  // ─── [SECTION 5] 데이터 영속성 (LocalStorage) ───
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('my-playlists', JSON.stringify(playlists))
    }
  }, [playlists, isMounted])

  // ─── [SECTION 6] 재생 로직 제어 ───
  const extractVideoId = (url: string) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : ''
  }

  // 수면 타이머
  useEffect(() => {
    if (sleepTime === null) return
    if (sleepTime <= 0) {
      setPlay(false)
      if (playerRef.current) playerRef.current.pauseVideo()
      setSleepTime(null)
      setTimeout(() => {
        alert('수면 타이머가 종료되어 음악을 정지합니다.')
      }, 100)
      return
    }
    const timer = setInterval(() => {
      setSleepTime((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)
    return () => clearInterval(timer)
  }, [sleepTime])

  const playSpecificSong = (song: Song) => {
    const videoId = extractVideoId(song.youtubeUrl)
    if (!videoId || !playerRef.current) return
    setCurrentSong(song)
    setPlay(true)
    playerRef.current.loadVideoById(videoId)
  }

  const fetchRecommendedNextSong = async (
    videoId: string,
    currentTitle: string
  ): Promise<Song | null> => {
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
    if (!API_KEY) return null
    const query = encodeURIComponent(`${currentTitle} 관련 노래`)
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${query}&type=video&videoCategoryId=10&key=${API_KEY}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        const filtered = data.items.filter(
          (item: any) => item.id.videoId !== videoId
        )
        const video = filtered.length > 0 ? filtered[0] : data.items[0]
        return {
          id: crypto.randomUUID(),
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.high.url,
          youtubeUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        }
      }
    } catch (error) {
      console.error('추천 곡 로드 실패:', error)
    }
    return null
  }

  const handleNextSong = async () => {
    // 통합 Ref로부터 최신 상태 추출
    const {playlists, playingPlaylistId, currentSong, isAutoPlay} =
      stateRef.current

    const list = playlists.find((p) => p.id === playingPlaylistId)
    if (!list || list.songs.length === 0) return

    const currentIndex = list.songs.findIndex((s) => s.id === currentSong?.id)

    if (currentIndex !== -1 && currentIndex < list.songs.length - 1) {
      playSpecificSong(list.songs[currentIndex + 1])
    } else {
      if (isAutoPlay) {
        const currentListIndex = playlists.findIndex((p) => p.id === list.id)
        if (
          currentListIndex !== -1 &&
          currentListIndex < playlists.length - 1
        ) {
          const nextPlaylist = playlists[currentListIndex + 1]
          if (nextPlaylist.songs.length > 0) {
            handlePlaySong(nextPlaylist.songs[0], nextPlaylist)
            setActiveIndex(currentListIndex + 1)
          } else {
            playSpecificSong(list.songs[0])
          }
        } else {
          const firstPlaylist = playlists[0]
          if (firstPlaylist && firstPlaylist.songs.length > 0) {
            handlePlaySong(firstPlaylist.songs[0], firstPlaylist)
            setActiveIndex(0)
          }
        }
      } else {
        playSpecificSong(list.songs[0])
      }
    }
  }

  const handlePrevSong = () => {
    // 통합 Ref로부터 최신 상태 추출
    const {playlists, playingPlaylistId, currentSong, isAutoPlay} =
      stateRef.current

    const list = playlists.find((p) => p.id === playingPlaylistId)
    if (!list || list.songs.length === 0) return

    const currentIndex = list.songs.findIndex((s) => s.id === currentSong?.id)

    if (currentIndex > 0) {
      playSpecificSong(list.songs[currentIndex - 1])
    } else {
      if (isAutoPlay) {
        const currentListIndex = playlists.findIndex((p) => p.id === list.id)
        if (currentListIndex > 0) {
          const prevPlaylist = playlists[currentListIndex - 1]
          if (prevPlaylist.songs.length > 0) {
            const lastSongOfPrevList =
              prevPlaylist.songs[prevPlaylist.songs.length - 1]
            handlePlaySong(lastSongOfPrevList, prevPlaylist)
            setActiveIndex(currentListIndex - 1)
          }
        } else {
          const lastPlaylist = playlists[playlists.length - 1]
          if (lastPlaylist.songs.length > 0) {
            const lastSong = lastPlaylist.songs[lastPlaylist.songs.length - 1]
            handlePlaySong(lastSong, lastPlaylist)
            setActiveIndex(playlists.length - 1)
          }
        }
      } else {
        const lastIndex = list.songs.length - 1
        playSpecificSong(list.songs[lastIndex])
      }
    }
  }

  useEffect(() => {
    if (playerRef.current && playerRef.current.getPlayerState) {
      if (play) playerRef.current.playVideo()
      else playerRef.current.pauseVideo()
    }
  }, [play])

  const handlePlaySong = (song: Song, playlist: Playlist) => {
    setPlayingPlaylistId(playlist.id)
    setPlayingPlaylistName(playlist.title)
    playSpecificSong(song)
  }

  const handlePlayPlaylist = (playlist: Playlist) => {
    if (playlist.songs.length > 0) handlePlaySong(playlist.songs[0], playlist)
    else alert('재생할 곡이 없습니다.')
  }

  // ─── [SECTION 7] 플레이리스트 편집 로직 ───
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
      if (playerRef.current) playerRef.current.stopVideo()
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.items) {
        setSearchResults(data.items)
      }
    } catch (error) {
      console.error('검색 중 오류 발생:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // 데이터 관련 함수
  const addNewSongByUrl = async (url: string) => {
    const currentActive = playlists[activeIndex]
    if (!url.trim() || !currentActive) return

    const videoId = extractVideoId(url)
    if (!videoId) return alert('유효한 유튜브 링크가 아닙니다.')

    try {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      )
      const data = await res.json()

      const newSong: Song = {
        id: crypto.randomUUID(),
        title: data.title || '제목 없음',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        youtubeUrl: url,
      }

      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === currentActive.id ? {...p, songs: [...p.songs, newSong]} : p
        )
      )
      return true
    } catch {
      alert('정보를 가져오지 못했습니다.')
      return false
    }
  }

  const addSong = async () => {
    const success = await addNewSongByUrl(youtubeUrl)
    if (success) setYoutubeUrl('')
  }

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const url = e.dataTransfer.getData('text')

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      await addNewSongByUrl(url)
    }
  }
  const addSongFromSearch = (video: any) => {
    const currentActive = playlists[activeIndex]
    if (!currentActive) return
    const newSong: Song = {
      id: crypto.randomUUID(),
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    }
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === currentActive.id ? {...p, songs: [...p.songs, newSong]} : p
      )
    )
    setSearchResults([])
    setSearchQuery('')
  }

  const deleteSong = (songId: string, index: number) => {
    const currentActive = playlists[activeIndex]
    if (!currentActive) return
    const isDeletingCurrent = currentSong?.id === songId
    const updatedSongs = currentActive.songs.filter((s) => s.id !== songId)
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === currentActive.id ? {...p, songs: updatedSongs} : p
      )
    )
    if (playingPlaylistId === currentActive.id && isDeletingCurrent) {
      if (updatedSongs.length > 0) handleNextSong()
      else {
        setPlay(false)
        setCurrentSong(null)
        if (playerRef.current) playerRef.current.stopVideo()
      }
    }
  }

  // ─── [SECTION 8] UI 편의 기능 (드래그, 스크롤) ───
  const scrollToCurrentSong = () => {
    if (!currentSong || !playingPlaylistId) return
    const playlistIndex = playlists.findIndex((p) => p.id === playingPlaylistId)
    if (playlistIndex === -1) return
    setActiveIndex(playlistIndex)
    setModal(true)
    setTimeout(() => {
      const el = document.getElementById(`song-${currentSong.id}`)
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'})
        el.classList.add('highlight-song')
        setTimeout(() => el.classList.remove('highlight-song'), 2000)
      }
    }, 100)
  }

  const onDragStart = (index: number) => setDraggedItemIndex(index)
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return
    const currentActive = playlists[activeIndex]
    const newSongs = [...currentActive.songs]
    const draggedItem = newSongs[draggedItemIndex]
    newSongs.splice(draggedItemIndex, 1)
    newSongs.splice(targetIndex, 0, draggedItem)
    setPlaylists((prev) =>
      prev.map((p) => (p.id === currentActive.id ? {...p, songs: newSongs} : p))
    )
    setDraggedItemIndex(null)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // ─── [SECTION 9] 렌더링 변수 ───
  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const rightAlbum =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null

  // ─── [SECTION 10] JSX 레이아웃 ───
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
            {left.songs[0]?.thumbnail ? (
              <img src={left.songs[0].thumbnail} alt="" />
            ) : (
              <div className="no-thumbnail">곡 없음</div>
            )}
          </div>
        )}
        {center && (
          <div className="playlist-album center" onClick={() => setModal(true)}>
            <div className="playlist-album-title">{center.title}</div>
            {currentSong && playingPlaylistId === center.id ? (
              <img
                src={currentSong.thumbnail}
                alt=""
                className="album-img playing"
              />
            ) : center.songs[0]?.thumbnail ? (
              <img
                src={center.songs[0].thumbnail}
                alt=""
                className="album-img"
              />
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
          {activeTab === 'search' && searchResults.length > 0 && (
            <div
              className="dropdown-layer"
              onClick={(e) => {
                e.stopPropagation()
                setSearchResults([])
              }}
            />
          )}
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button
              className="playlist-delete-anchor"
              onClick={() => deletePlaylist(center.id)}
            >
              삭제
            </button>
            <div className="modal-inner-left">
              <div className="playlist-title">
                {playingPlaylistName ? `${playingPlaylistName} 재생 중...` : ''}
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
                  <div className="search-box-container">
                    <select
                      className="search-dropdown"
                      value={activeTab}
                      onChange={(e) => {
                        setActiveTab(e.target.value as 'search' | 'url')
                        setSearchResults([])
                      }}
                    >
                      <option value="search">유튜브 검색으로 추가</option>
                      <option value="url">동영상 URL로 추가</option>
                    </select>
                    <div className="input-row">
                      {activeTab === 'search' ? (
                        <>
                          <input
                            className="search-input"
                            placeholder="곡 제목 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === 'Enter' && handleSearch()
                            }
                          />
                          <button className="search-btn" onClick={handleSearch}>
                            검색
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            className="search-input"
                            placeholder="유튜브 링크 붙여넣기"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSong()}
                          />
                          <button className="search-btn" onClick={addSong}>
                            추가
                          </button>
                        </>
                      )}
                    </div>
                    {activeTab === 'search' && searchResults.length > 0 && (
                      <>
                        <div className="search-results-dropdown">
                          {searchResults.map((video) => (
                            <div
                              key={video.id.videoId}
                              className="search-result-item"
                              onClick={() => addSongFromSearch(video)}
                            >
                              <img
                                src={video.snippet.thumbnails.default.url}
                                alt=""
                              />
                              <div className="result-info">
                                <p className="result-title">
                                  {video.snippet.title}
                                </p>
                                <p className="result-channel">
                                  {video.snippet.channelTitle}
                                </p>
                              </div>
                            </div>
                          ))}
                          <button
                            className="search-close-btn"
                            onClick={() => setSearchResults([])}
                          >
                            닫기
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="modal-inner-list"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleExternalDrop}
              >
                {center.songs.length === 0 && (
                  <div className="no-songs-msg">
                    곡을 추가하거나 링크를 드래그해 오세요.
                  </div>
                )}
                {center.songs
                  .filter((song) =>
                    activeTab === 'search'
                      ? song.title
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((song, i) => (
                    <div
                      key={song.id}
                      id={`song-${song.id}`}
                      className={`song-item ${currentSong?.id === song.id ? 'active-playing' : ''}`}
                      onClick={() => handlePlaySong(song, center)}
                    >
                      <div
                        className="drag-handle"
                        draggable
                        onDragStart={() => onDragStart(i)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, i)}
                      >
                        ☰
                      </div>
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
                        <button onClick={() => deleteSong(song.id, i)}>
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

      <div className="icon-container">
        <div className="icon-wrapper">
          <button className={`autoplay-toggle ${isAutoPlay ? 'on' : 'off'}`}>
            <span className="icon">🔁</span>
          </button>
          <div className="setting-menu">
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
        <div className="icon-wrapper">
          <button className={`timer-btn ${sleepTime !== null ? 'active' : ''}`}>
            <span className="icon">⌛</span>
          </button>
          <div className="setting-menu">
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
                <div className="remaining-time">{formatTime(sleepTime)}</div>
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
      </div>

      <div className="music-var">
        <div className="music-var-title">
          {playingPlaylistName ? `[${playingPlaylistName}] ` : ''}
          {currentSong?.title || '플레이 리스트를 선택해주세요'}
        </div>
        {currentSong ? (
          <img
            src={currentSong.thumbnail}
            alt=""
            className="mini-thumbnail"
            onClick={scrollToCurrentSong}
          />
        ) : (
          <div className="mini-thumbnail-placeholder" />
        )}
        <div className="control-btns">
          <button onClick={handlePrevSong}>
            <img src="/img/main-prevBtn.png" alt="" />
          </button>
          <button onClick={() => setPlay(!play)}>
            <img
              src={play ? '/img/main-pauseBtn.png' : '/img/main-playBtn.png'}
              alt=""
            />
          </button>
          <button onClick={handleNextSong}>
            <img src="/img/main-nextBtn.png" alt="" />
          </button>
        </div>
      </div>
    </div>
  )
}
