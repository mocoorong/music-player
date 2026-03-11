'use client'

import {useState, useEffect, Dispatch, SetStateAction} from 'react'
import {Song, Playlist} from './ClientHome'
import {addSong, deleteSongAction} from '../actions' // 서버 액션 임포트

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  playlist: Playlist
  updatePlaylist: (
    payload: Partial<Playlist> | ((p: Playlist) => Playlist),
    targetId?: string
  ) => void
  setPlaylists: Dispatch<SetStateAction<Playlist[]>> // 추가됨
  currentSong: Song | null
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
  updatePlaylist,
  setPlaylists,
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
        if (searchResults.length > 0) setSearchResults([])
        else onClose()
      }
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, searchResults, onClose])

  useEffect(() => {
    setTempTitle(playlist.title)
  }, [playlist.id, playlist.title])

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
    // 참고: 제목 수정도 DB에 반영하려면 별도의 updatePlaylistAction이 필요합니다.
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

  // [DB 연동] URL로 노래 추가
  const addNewSongByUrl = async (url: string) => {
    const videoId = extractVideoId(url)
    if (!videoId) return alert('유효한 유튜브 링크가 아닙니다.')

    try {
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      )
      const data = await res.json()
      const title = data.title || '제목 없음'
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

      // 1. DB 저장 요청
      const result = await addSong(playlist.id, title, url, thumbnail)

      if (result.success) {
        // 2. 클라이언트 상태 갱신
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlist.id
              ? {...p, songs: [...p.songs, result.song as Song]}
              : p
          )
        )
        return true
      }
    } catch {
      alert('정보를 가져오지 못했습니다.')
    }
    return false
  }

  // [DB 연동] 검색 결과에서 노래 추가
  const addSongFromSearch = async (video: any) => {
    const title = video.snippet.title
    const thumbnail = video.snippet.thumbnails.high.url
    const url = `https://www.youtube.com/watch?v=${video.id.videoId}`

    const result = await addSong(playlist.id, title, url, thumbnail)

    if (result.success) {
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlist.id
            ? {...p, songs: [...p.songs, result.song as Song]}
            : p
        )
      )
      setSearchResults([])
      setSearchQuery('')
    }
  }

  // [DB 연동] 노래 삭제
  const deleteSong = async (songId: string) => {
    if (!confirm('이 곡을 삭제하시겠습니까?')) return

    const result = await deleteSongAction(songId)

    if (result.success) {
      // 클라이언트 상태 업데이트
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlist.id
            ? {...p, songs: p.songs.filter((s) => s.id !== songId)}
            : p
        )
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
  }

  // 드래그 앤 드롭 (순서 변경은 DB 정렬 필드가 필요하므로 우선 로컬 UI만 동작)
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

  const onDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const url = e.dataTransfer.getData('text')
    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      await addNewSongByUrl(url)
      return
    }
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null)
      return
    }
    const newSongs = [...playlist.songs]
    const draggedItem = newSongs[draggedItemIndex]
    newSongs.splice(draggedItemIndex, 1)
    newSongs.splice(targetIndex, 0, draggedItem)

    const songsNewOrder = newSongs.map((song, index) => ({
      ...song,
      order: index,
    }))

    updatePlaylist({songs: songsNewOrder}, playlist.id)
    setDraggedItemIndex(null)

    try {
      const {updateSongOrderAction} = await import('../actions')
      const result = await updateSongOrderAction(
        songsNewOrder.map((s) => ({id: s.id, order: s.order}))
      )
      if (!result.success) {
        alert('순서 저장에 실패했습니다. 다시 시도해 주세요.')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const url = e.dataTransfer.getData('text')
    if (url.includes('youtube.com') || url.includes('youtu.be'))
      await addNewSongByUrl(url)
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-bg"
      onClick={() => {
        if (searchResults.length > 0) {
          setSearchResults([])
          setSearchQuery('')
        } else {
          onClose()
          setYoutubeUrl('')
          setSearchQuery('')
        }
      }}
    >
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner-left"></div>
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
                  <span className="title-text">{playlist.title}</span>
                  <span className="edit-icon">✎</span>
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
                activeTab === 'search' && searchQuery
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
