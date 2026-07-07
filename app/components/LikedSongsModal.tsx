'use client'

import {usePlayerStore} from '../store/usePlayerStore'

interface LikedSongsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LikedSongsModal({
  isOpen,
  onClose,
}: LikedSongsModalProps) {
  const {
    likedSongs,
    currentSong,
    playingPlaylistId,
    handlePlaySong,
    toggleLike,
  } = usePlayerStore()

  if (!isOpen) return null

  const likedPlaylist = {
    id: '__liked__',
    title: '좋아요한 곡',
    songs: likedSongs,
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner-left"></div>
        <div className="modal-inner-right">
          <div className="modal-inner-title">
            <p className="modal-title-display">
              <span className="title-text">좋아요한 곡</span>
            </p>
          </div>
          <div className="modal-inner-list">
            {likedSongs.length === 0 && (
              <div className="no-songs-msg">좋아요한 곡이 없습니다.</div>
            )}
            {likedSongs.map((song) => (
              <div
                key={song.id}
                className={`song-item ${
                  currentSong?.id === song.id &&
                  playingPlaylistId === '__liked__'
                    ? 'active-playing'
                    : ''
                }`}
                onClick={() => handlePlaySong(song, likedPlaylist)}
              >
                <div className="song-info">
                  <img
                    src={song.thumbnail || '/default-thumbnail.png'}
                    className="song-thumbnail"
                    alt={song.title}
                  />
                  <span className="song-title-text">{song.title}</span>
                </div>
                <div
                  className="song-controls"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="like-btn liked"
                    onClick={() => toggleLike(song)}
                  >
                    ♥
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
