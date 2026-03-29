'use client'

import {useState, useRef, useEffect} from 'react'
import {addPlaylistAction, deletePlaylistAction} from '../actions'
import {Song, Playlist} from '../components/ClientHome'

export function useMusicPlayer(initialPlaylists: Playlist[]) {
  const [play, setPlay] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [playingPlaylistName, setPlayingPlaylistName] = useState<string>('')
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string>('')
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists)
  const [activeIndex, setActiveIndex] = useState<number>(
    initialPlaylists.length > 0 ? 0 : -1
  )
  const [modal, setModal] = useState(false)
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [sleepTime, setSleepTime] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [isShuffle, setIsShuffle] = useState(false)
  const [originalSongs, setOriginalSongs] = useState<Song[]>([])

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

  // 유튜브 API 초기화 및 타이머 로직 (기존과 동일)
  useEffect(() => {
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
        playerVars: {autoplay: 1, rel: 0, controls: 1},
        events: {onStateChange: (e: any) => e.data === 0 && handleSkip(1)},
      })
    }
  }, [])

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

  // 핸들러 함수들 (기존 로직 그대로)
  const extractVideoId = (url: string) => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[7].length === 11 ? match[7] : ''
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

  const deletePlaylist = async (id: string) => {
    if (!confirm('이 플레이 리스트를 삭제하시겠습니까?')) return
    const result = await deletePlaylistAction(id)
    if (result.success) {
      const next = playlists.filter((p) => p.id !== id)
      if (playingPlaylistId === id) {
        setCurrentSong(null)
        setPlay(false)
        setPlayingPlaylistName('')
        setPlayingPlaylistId('')
        playerRef.current?.stopVideo()
      }
      setPlaylists(next)
      setActiveIndex((prev) => (next.length > 0 ? Math.max(0, prev - 1) : -1))
    }
  }

  const addPlaylist = async () => {
    const newTitle =
      playlists.length === 0
        ? '새 플레이리스트'
        : `새 플레이리스트 (${playlists.length})`
    const result = await addPlaylistAction(newTitle)
    if (result.success) {
      setPlaylists([...playlists, result.data as Playlist])
      setActiveIndex(playlists.length)
      setModal(true)
    }
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

  const toggleShuffle = () => {
    // 현재 재생 중인 플레이리스트를 찾음
    const currentList = playlists.find((p) => p.id === playingPlaylistId)
    if (!currentList) return

    if (!isShuffle) {
      // 셔플 활성화: 현재 곡 목록 저장 후 섞기
      setOriginalSongs([...currentList.songs])

      const shuffled = [...currentList.songs].sort(() => Math.random() - 0.5)

      // 현재 재생 중인 곡이 있다면 맨 앞으로 유지하여 흐름 방지
      if (currentSong) {
        const filtered = shuffled.filter((s) => s.id !== currentSong.id)
        const newList = [currentSong, ...filtered]
        updatePlaylist({songs: newList}, playingPlaylistId)
      } else {
        updatePlaylist({songs: shuffled}, playingPlaylistId)
      }
    } else {
      // 셔플 비활성화: 저장해둔 원본 목록으로 복구
      if (originalSongs.length > 0) {
        updatePlaylist({songs: originalSongs}, playingPlaylistId)
      }
    }
    setIsShuffle(!isShuffle)
  }

  return {
    state: {
      play,
      currentSong,
      playingPlaylistName,
      playingPlaylistId,
      playlists,
      activeIndex,
      modal,
      isAutoPlay,
      sleepTime,
      openMenu,
      isLoading,
      loadingText,
      isShuffle,
    },
    actions: {
      setPlay,
      setCurrentSong,
      setPlaylists,
      setActiveIndex,
      setModal,
      setIsAutoPlay,
      setSleepTime,
      setOpenMenu,
      setIsLoading,
      setLoadingText,
      handlePlaySong,
      handleSkip,
      deletePlaylist,
      addPlaylist,
      updatePlaylist,
      playSpecificSong,
      toggleShuffle,
    },
    playerRef,
  }
}
