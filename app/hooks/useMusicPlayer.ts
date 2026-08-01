'use client'

import {useEffect} from 'react'
import {
  usePlayerStore,
  playerRef,
  pendingSongRef,
} from '../store/usePlayerStore'
import {Playlist} from '../components/ClientHome'

export function useMusicPlayer(initialPlaylists: Playlist[]) {
  const {play, sleepTime, setPlay, setSleepTime, setPlaylists, setActiveIndex} =
    usePlayerStore()

  useEffect(() => {
    setPlaylists(initialPlaylists)
    if (initialPlaylists.length > 0) {
      setActiveIndex(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const createPlayer = () => {
      if (playerRef.current || !window.YT?.Player) return

      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: '',
        playerVars: {autoplay: 1, rel: 0, controls: 1},
        events: {
          onReady: () => {
            const pendingSong = pendingSongRef.current
            if (!pendingSong) return

            pendingSongRef.current = null
            usePlayerStore.getState().playSpecificSong(pendingSong)
          },
          onStateChange: (e: YT.OnStateChangeEvent) =>
            e.data === 0 && usePlayerStore.getState().handleSkip(1),
        },
      })
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      window.onYouTubeIframeAPIReady = createPlayer
    }

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      )
    ) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
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
}
