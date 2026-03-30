'use client'

import {useState, useEffect} from 'react'
import {Song, Playlist} from '../components/ClientHome'
import {addSong, deleteSongAction, updatePlaylistTitleAction} from '../actions'

interface UseModalLogicProps {
  playlist: Playlist
  isOpen: boolean
  onClose: () => void
  currentSong: Song | null
  updatePlaylist: (
    payload: Partial<Playlist> | ((p: Playlist) => Playlist),
    targetId?: string
  ) => void
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>
  handleSkip: (direction: number) => void
  setPlay: (play: boolean) => void
  setCurrentSong: (song: Song | null) => void
  playerRef: React.MutableRefObject<any>
}

export function useModalLogic({
  playlist,
  isOpen,
  onClose,
  currentSong,
  updatePlaylist,
  setPlaylists,
  handleSkip,
  setPlay,
  setCurrentSong,
  playerRef,
}: UseModalLogicProps) {
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

  const handleTitleUpdate = async () => {
    const newTitle = tempTitle.trim() || '제목 없음'

    updatePlaylist({title: newTitle}, playlist.id)
    setIsEditingTitle(false)

    try {
      const result = await updatePlaylistTitleAction(playlist.id, newTitle)
      if (!result.success) {
        alert('서버 저장에 실패했습니다: ' + result.error)

        setTempTitle(playlist.title)
        updatePlaylist({title: playlist.title}, playlist.id)
      }
    } catch (error) {
      console.error(error)
    }
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
      const title = data.title || '제목 없음'
      const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      const result = await addSong(playlist.id, title, url, thumbnail)
      if (result.success) {
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

  const deleteSong = async (songId: string) => {
    if (!confirm('이 곡을 삭제하시겠습니까?')) return
    const result = await deleteSongAction(songId)
    if (result.success) {
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

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index)
    e.dataTransfer.effectAllowed = 'move'

    const dragTarget = (e.target as HTMLElement).closest('.song-item')
    if (dragTarget) e.dataTransfer.setDragImage(dragTarget, 20, 20)
  }

  const handleExternalDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const url = e.dataTransfer.getData('text')
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      await addNewSongByUrl(url)
    }
  }

  const onDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    const url = e.dataTransfer.getData('text')

    if (draggedItemIndex !== null) {
      if (draggedItemIndex === targetIndex) {
        setDraggedItemIndex(null)
        return
      }

      const newSongs = [...playlist.songs]
      const [draggedItem] = newSongs.splice(draggedItemIndex, 1)
      newSongs.splice(targetIndex, 0, draggedItem)

      const songsNewOrder = newSongs.map((song, index) => ({
        ...song,
        order: index,
      }))

      updatePlaylist({songs: songsNewOrder}, playlist.id)
      setDraggedItemIndex(null)

      try {
        const {updateSongOrderAction} = await import('../actions')
        await updateSongOrderAction(
          songsNewOrder.map((s) => ({id: s.id, order: s.order}))
        )
      } catch (error) {
        console.error(error)
      }
      return
    }

    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      await addNewSongByUrl(url)
    }
  }
  const filteredSongs = playlist.songs.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  return {
    state: {
      tempTitle,
      youtubeUrl,
      isEditingTitle,
      searchQuery,
      searchResults,
      activeTab,
      draggedItemIndex,
      filteredSongs,
    },
    actions: {
      setTempTitle,
      setYoutubeUrl,
      setIsEditingTitle,
      setSearchQuery,
      setSearchResults,
      setActiveTab,
      handleTitleUpdate,
      handleSearch,
      addNewSongByUrl,
      addSongFromSearch,
      deleteSong,
      onDragStart,
      onDrop,
      handleExternalDrop,
    },
  }
}
