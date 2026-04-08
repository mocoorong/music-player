import {Song, Playlist} from './ClientHome'

interface MusicVarProps {
  playbackControls: {
    currentSong: Song | null
    playingPlaylistName: string
    playingPlaylistId: string
    handlePlaySong: (song: Song, playlist: Playlist) => void
    handleSkip: (direction: number) => void
    setCurrentSong: (song: Song | null) => void
    setPlay: (play: boolean) => void
    play: boolean
    playerRef: any
  }
  scrollToCurrentSong: () => void
}
export default function MusicVar({
  playbackControls,
  scrollToCurrentSong,
}: MusicVarProps) {
  const {currentSong, playingPlaylistName, play, setPlay, handleSkip} =
    playbackControls

  return (
    <div className="music-var">
      <div className="music-var-spacer" />

      <div className="music-var-center">
        <div className="music-var-title">
          {playingPlaylistName ? `[${playingPlaylistName}] ` : ''}
          {currentSong?.title || '플레이 리스트를 선택해주세요'}
        </div>
        <div className="control-btns">
          <button onClick={() => handleSkip(-1)}>
            <img src="/img/main-prevBtn.png" alt="prev" />
          </button>
          <button onClick={() => setPlay(!play)}>
            <img
              src={play ? '/img/main-pauseBtn.png' : '/img/main-playBtn.png'}
              alt="play"
            />
          </button>
          <button onClick={() => handleSkip(1)}>
            <img src="/img/main-nextBtn.png" alt="next" />
          </button>
        </div>
      </div>

      <div className="music-var-thumb-zone">
        {currentSong && (
          <img
            src={currentSong.thumbnail}
            className="mini-thumbnail"
            onClick={scrollToCurrentSong}
            alt="thumb"
          />
        )}
      </div>
    </div>
  )
}
