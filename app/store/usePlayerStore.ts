import {create} from 'zustand'
import {Song, Playlist} from '../components/ClientHome'
import {
  addPlaylistAction,
  deletePlaylistAction,
  toggleLikeAction,
} from '../actions'

export const playerRef: {current: any} = {current: null}
export const pendingSongRef: {current: Song | null} = {current: null}

const extractVideoId = (url: string) => {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : ''
}

interface PlayerState {
  play: boolean
  currentSong: Song | null
  playingPlaylistName: string
  playingPlaylistId: string
  playlists: Playlist[]
  activeIndex: number
  modal: boolean
  isAutoPlay: boolean
  sleepTime: number | null
  openMenu: string | null
  isLoading: boolean
  loadingText: string
  originalOrders: Record<string, Song[]>
  likedSongs: Song[]

  setLikedSongs: (songs: Song[]) => void
  toggleLike: (song: Song) => Promise<void>
  setPlay: (v: boolean) => void
  setCurrentSong: (s: Song | null) => void
  setPlaylists: (p: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void
  setActiveIndex: (i: number | ((prev: number) => number)) => void
  setModal: (v: boolean) => void
  setIsAutoPlay: (v: boolean) => void
  setSleepTime: (
    v: number | null | ((prev: number | null) => number | null)
  ) => void
  setOpenMenu: (
    v: string | null | ((prev: string | null) => string | null)
  ) => void
  setIsLoading: (v: boolean) => void
  setLoadingText: (v: string) => void

  playSpecificSong: (song: Song) => void
  handlePlaySong: (song: Song, playlist: Playlist) => void
  handleSkip: (direction: number) => void
  deletePlaylist: (id: string) => Promise<void>
  addPlaylist: () => Promise<void>
  updatePlaylist: (
    payload: Partial<Playlist> | ((p: Playlist) => Playlist),
    targetId?: string
  ) => void
  shufflePlaylist: (targetPlaylistId: string) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  play: false,
  currentSong: null,
  playingPlaylistName: '',
  playingPlaylistId: '',
  playlists: [],
  activeIndex: -1,
  modal: false,
  isAutoPlay: false,
  sleepTime: null,
  openMenu: null,
  isLoading: false,
  loadingText: '',
  originalOrders: {},
  likedSongs: [],

  setPlay: (v) => set({play: v}),
  setCurrentSong: (s) => set({currentSong: s}),
  setPlaylists: (p) =>
    set((state) => ({
      playlists: typeof p === 'function' ? p(state.playlists) : p,
    })),
  setActiveIndex: (i) =>
    set((state) => ({
      activeIndex: typeof i === 'function' ? i(state.activeIndex) : i,
    })),
  setModal: (v) => set({modal: v}),
  setIsAutoPlay: (v) => set({isAutoPlay: v}),
  setSleepTime: (v) =>
    set((state) => ({
      sleepTime: typeof v === 'function' ? v(state.sleepTime) : v,
    })),
  setOpenMenu: (v) =>
    set((state) => ({
      openMenu: typeof v === 'function' ? v(state.openMenu) : v,
    })),
  setIsLoading: (v) => set({isLoading: v}),
  setLoadingText: (v) => set({loadingText: v}),
  setLikedSongs: (songs) => set({likedSongs: songs}),

  playSpecificSong: (song) => {
    const videoId = extractVideoId(song.youtubeUrl)
    if (!videoId) return
    set({currentSong: song, play: true})
    if (!playerRef.current) {
      pendingSongRef.current = song
      return
    }
    playerRef.current.loadVideoById(videoId)
  },

  handlePlaySong: (song, playlist) => {
    set({playingPlaylistId: playlist.id, playingPlaylistName: playlist.title})
    get().playSpecificSong(song)
  },

  handleSkip: (direction) => {
    const {playlists, playingPlaylistId, currentSong, isAutoPlay, likedSongs} =
      get()
    const isLiked = playingPlaylistId === '__liked__'
    const list = isLiked
      ? {id: '__liked__', songs: likedSongs}
      : playlists.find((p) => p.id === playingPlaylistId)
    if (!list || list.songs.length === 0) return

    const currentIndex = list.songs.findIndex((s) => s.id === currentSong?.id)
    const nextIndex = currentIndex + direction

    if (nextIndex >= 0 && nextIndex < list.songs.length) {
      get().playSpecificSong(list.songs[nextIndex])
      return
    }

    if (isAutoPlay && !isLiked) {
      const currentListIdx = playlists.findIndex((p) => p.id === list.id)
      const nextListIdx =
        (currentListIdx + direction + playlists.length) % playlists.length
      const nextList = playlists[nextListIdx]
      if (nextList.songs.length > 0) {
        get().handlePlaySong(
          direction > 0
            ? nextList.songs[0]
            : nextList.songs[nextList.songs.length - 1],
          nextList
        )
        set({activeIndex: nextListIdx})
      }
      return
    }

    get().playSpecificSong(
      list.songs[direction > 0 ? 0 : list.songs.length - 1]
    )
  },

  deletePlaylist: async (id) => {
    if (!confirm('이 플레이 리스트를 삭제하시겠습니까?')) return
    const result = await deletePlaylistAction(id)
    if (!result.success) return
    const {playlists, playingPlaylistId, activeIndex, likedSongs} = get()
    const target = playlists.find((p) => p.id === id)
    const next = playlists.filter((p) => p.id !== id)
    if (playingPlaylistId === id) {
      set({
        currentSong: null,
        play: false,
        playingPlaylistName: '',
        playingPlaylistId: '',
      })
      playerRef.current?.stopVideo()
    }
    if (target) {
      const removedUrls = new Set(target.songs.map((s) => s.youtubeUrl))
      set({
        likedSongs: likedSongs.filter((s) => !removedUrls.has(s.youtubeUrl)),
      })
    }
    set({
      playlists: next,
      activeIndex: next.length > 0 ? Math.max(0, activeIndex - 1) : -1,
    })
  },

  addPlaylist: async () => {
    const {playlists} = get()
    const newTitle =
      playlists.length === 0
        ? '새 플레이리스트'
        : `새 플레이리스트 (${playlists.length})`
    const result = await addPlaylistAction(newTitle)
    if (result.success) {
      set({
        playlists: [...playlists, result.data as Playlist],
        activeIndex: playlists.length,
        modal: true,
      })
    }
  },

  updatePlaylist: (payload, targetId) => {
    const {playlists, activeIndex, playingPlaylistId} = get()
    const id = targetId || playlists[activeIndex]?.id
    if (!id) return
    const nextPlaylists = playlists.map((p) => {
      if (p.id !== id) return p
      const updated =
        typeof payload === 'function' ? payload(p) : {...p, ...payload}
      if (playingPlaylistId === id && (payload as any).title) {
        set({playingPlaylistName: (payload as any).title})
      }
      return updated
    })
    set({playlists: nextPlaylists})
  },

  shufflePlaylist: (targetPlaylistId) => {
    const {playlists, playingPlaylistId, currentSong, originalOrders} = get()
    const currentList = playlists.find((p) => p.id === targetPlaylistId)
    if (!currentList || currentList.songs.length === 0) return

    const saved = originalOrders[targetPlaylistId]
    const restoredOrRandomized = saved
      ? saved
      : [...currentList.songs].sort(() => Math.random() - 0.5)

    const nextOriginalOrders = {...originalOrders}
    if (saved) {
      delete nextOriginalOrders[targetPlaylistId]
    } else {
      nextOriginalOrders[targetPlaylistId] = currentList.songs
    }
    set({originalOrders: nextOriginalOrders})

    if (playingPlaylistId === targetPlaylistId && currentSong) {
      const filtered = restoredOrRandomized.filter(
        (s) => s.id !== currentSong.id
      )
      get().updatePlaylist(
        {songs: [currentSong, ...filtered]},
        targetPlaylistId
      )
    } else {
      get().updatePlaylist({songs: restoredOrRandomized}, targetPlaylistId)
    }
  },

  toggleLike: async (song) => {
    const {likedSongs} = get()
    const isLiked = likedSongs.some((s) => s.youtubeUrl === song.youtubeUrl)

    set({
      likedSongs: isLiked
        ? likedSongs.filter((s) => s.youtubeUrl !== song.youtubeUrl)
        : [song, ...likedSongs],
    })

    const result = await toggleLikeAction(
      song.youtubeUrl,
      song.title,
      song.thumbnail
    )
    if (!result.success) {
      set({likedSongs})
    }
  },
}))
