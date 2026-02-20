'use client'

import {useState, useEffect} from 'react'
import {Song, Playlist} from '../page'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  playlist: Playlist
  updatePlaylist: (
    payload: Partial<Playlist> | ((p: Playlist) => Playlist),
    targetId?: string
  ) => void
  currentSong: Song | null
  playingPlaylistName: string
  playingPlaylistId: string
  handlePlaySong: (song: Song, playlist: Playlist) => void
  handleSkip: (direction: number) => void
  setCurrentSong: (song: Song | null) => void
  setPlay: (play: boolean) => void
  playerRef: React.MutableRefObject<any>
}

export default function Modal({
  isOpen,
  onClose,
  playlist,
  currentSong,
  playingPlaylistName,
  playingPlaylistId,
  updatePlaylist,
  handlePlaySong,
  handleSkip,
  setCurrentSong,
  setPlay,
  playerRef,
}: ModalProps) {
  const [tempTitle, setTempTitle] = useState(playlist.title)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'search' | 'url'>('search')
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchResults.length > 0) {
          setSearchResults([]) // 검색 결과가 있으면 검색 결과만 닫음
        } else {
          onClose() // 검색 결과가 없으면 모달 자체를 닫음
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchResults, onClose])

  // 플레이리스트 바뀔 때 제목 동기화
  useEffect(() => {
    setTempTitle(playlist.title)
  }, [playlist.id, playlist.title])

  // URL에서 VideoID 추출
  const extractVideoId = (url: string) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : ''
  }

  const handleTitleUpdate = () => {
    const newTitle = tempTitle.trim() || '제목 없음'
    updatePlaylist({title: newTitle}, playlist.id)
    setIsEditingTitle(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}`
    try {
      const res = await fetch(url)
      const data = await res.json()
      if (data.items) setSearchResults(data.items)
    } catch (error) {
      console.error('검색 중 오류 발생:', error)
    }
  }

  const addNewSongByUrl = async (url: string) => {
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
      updatePlaylist(
        (prev) => ({...prev, songs: [...prev.songs, newSong]}),
        playlist.id
      )
      return true
    } catch {
      alert('정보를 가져오지 못했습니다.')
      return false
    }
  }

  const addSongFromSearch = (video: any) => {
    const newSong: Song = {
      id: crypto.randomUUID(),
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.high.url,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    }
    updatePlaylist(
      (prev) => ({...prev, songs: [...prev.songs, newSong]}),
      playlist.id
    )
    setSearchResults([])
    setSearchQuery('')
  }

  const deleteSong = (songId: string) => {
    updatePlaylist(
      (prev) => ({
        ...prev,
        songs: prev.songs.filter((s) => s.id !== songId),
      }),
      playlist.id
    )

    if (currentSong?.id === songId) {
      if (playlist.songs.length > 1) handleSkip(1)
      else {
        setPlay(false)
        setCurrentSong(null)
        playerRef.current?.stopVideo()
      }
    }
  }

  // 드래그 앤 드롭
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    const dragTarget = (e.target as HTMLElement).closest('.song-item')
    if (dragTarget) e.dataTransfer.setDragImage(dragTarget, 20, 20)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null)
      return
    }
    const newSongs = [...playlist.songs]
    const draggedItem = newSongs[draggedItemIndex]
    newSongs.splice(draggedItemIndex, 1)
    newSongs.splice(targetIndex, 0, draggedItem)
    updatePlaylist({songs: newSongs}, playlist.id)
    setDraggedItemIndex(null)
  }

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const url = e.dataTransfer.getData('text')
    if (url.includes('youtube.com') || url.includes('youtu.be'))
      await addNewSongByUrl(url)
  }

  if (!isOpen) return null

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner-left">
          <div className="playlist-title">
            {playingPlaylistId === playlist.id && playingPlaylistName
              ? `${playingPlaylistName} 재생 중...`
              : ''}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleUpdate()}
                />
              ) : (
                <p
                  className="modal-title-display"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {playlist.title} ✎
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
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                        onKeyDown={(e) =>
                          e.key === 'Enter' &&
                          addNewSongByUrl(youtubeUrl).then(
                            (s) => s && setYoutubeUrl('')
                          )
                        }
                      />
                      <button
                        className="search-btn"
                        onClick={() =>
                          addNewSongByUrl(youtubeUrl).then(
                            (s) => s && setYoutubeUrl('')
                          )
                        }
                      >
                        추가
                      </button>
                    </>
                  )}
                </div>
                {activeTab === 'search' && searchResults.length > 0 && (
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
                          <p className="result-title">{video.snippet.title}</p>
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
                )}
              </div>
            </div>
          </div>
          <div
            className="modal-inner-list"
            onDragOver={onDragOver}
            onDrop={handleExternalDrop}
          >
            {playlist.songs.length === 0 && (
              <div className="no-songs-msg">
                곡을 추가하거나 링크를 드래그해 오세요.
              </div>
            )}
            {playlist.songs
              .filter((song) =>
                activeTab === 'search'
                  ? song.title.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
              )
              .map((song, i) => (
                <div
                  key={song.id}
                  id={`song-${song.id}`}
                  className={`song-item ${currentSong?.id === song.id ? 'active-playing' : ''}`}
                  onClick={() => handlePlaySong(song, playlist)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, i)}
                >
                  <div
                    className="drag-handle"
                    draggable
                    onDragStart={(e) => onDragStart(e, i)}
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
                    <button onClick={() => deleteSong(song.id)}>X</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
