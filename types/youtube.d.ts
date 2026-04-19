export {}

declare global {
  namespace YT {
    interface Player {
      new (elementId: string, options: any): Player
      loadVideoById(videoId: string): void
      playVideo(): void
      pauseVideo(): void
      stopVideo(): void
      getPlayerState(): number
      destroy(): void
    }

    interface OnStateChangeEvent {
      data: number
      target: Player
    }
  }

  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}
