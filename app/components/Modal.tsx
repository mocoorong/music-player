'use client'

import {Song, Playlist} from './ClientHome'
import {useModalLogic} from '../hooks/useModalLogic'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  playlist: Playlist
  updatePlaylist: (
    payload: Partial<Playlist> | ((p: Playlist) => Playlist),
    targetId?: string
  ) => void
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>
  currentSong: Song | null
  handlePlaySong: (song: Song, playlist: Playlist) => void
  handleSkip: (direction: number) => void
  setCurrentSong: (song: Song | null) => void
  setPlay: (play: boolean) => void
  playerRef: React.MutableRefObject<any>
}

export default function Modal(props: ModalProps) {
  const {state, actions} = useModalLogic(props)
  const {isOpen, onClose, playlist, currentSong, handlePlaySong} = props

  if (!isOpen) return null

  return (
    <div
      className="modal-bg"
      onClick={() => {
        if (state.searchResults.length > 0) {
          actions.setSearchResults([])
          actions.setSearchQuery('')
        } else {
          onClose()
          actions.setYoutubeUrl('')
          actions.setSearchQuery('')
        }
      }}
    >
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner-left"></div>
        <div className="modal-inner-right">
          <div className="modal-inner-title">
            <div className="title-edit-zone">
              {state.isEditingTitle ? (
                <input
                  autoFocus
                  className="title-inline-input"
                  value={state.tempTitle}
                  onChange={(e) => actions.setTempTitle(e.target.value)}
                  onBlur={actions.handleTitleUpdate}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && actions.handleTitleUpdate()
                  }
                />
              ) : (
                <p
                  className="modal-title-display"
                  onClick={() => actions.setIsEditingTitle(true)}
                >
                  <span className="title-text">{playlist.title}</span>
                  <span className="edit-icon">✎</span>
                </p>
              )}
              <div className="search-box-container">
                <select
                  className="search-dropdown"
                  value={state.activeTab}
                  onChange={(e) => {
                    actions.setActiveTab(e.target.value as 'search' | 'url')
                    actions.setSearchResults([])
                  }}
                >
                  <option value="search">유튜브 검색으로 추가</option>
                  <option value="url">동영상 URL로 추가</option>
                </select>
                <div className="input-row">
                  {state.activeTab === 'search' ? (
                    <>
                      <input
                        className="search-input"
                        placeholder="곡 제목 검색"
                        value={state.searchQuery}
                        onChange={(e) => actions.setSearchQuery(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && actions.handleSearch()
                        }
                      />
                      <button
                        className="search-btn"
                        onClick={actions.handleSearch}
                      >
                        검색
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        className="search-input"
                        placeholder="유튜브 링크 붙여넣기"
                        value={state.youtubeUrl}
                        onChange={(e) => actions.setYoutubeUrl(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' &&
                          actions.addNewSongByUrl(state.youtubeUrl)
                        }
                      />
                      <button
                        className="search-btn"
                        onClick={() =>
                          actions.addNewSongByUrl(state.youtubeUrl)
                        }
                      >
                        추가
                      </button>
                    </>
                  )}
                </div>
                {state.activeTab === 'search' &&
                  state.searchResults.length > 0 && (
                    <div className="search-results-dropdown">
                      {state.searchResults.map((video) => (
                        <div
                          key={video.id.videoId}
                          className="search-result-item"
                          onClick={() => actions.addSongFromSearch(video)}
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
                        onClick={() => actions.setSearchResults([])}
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
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) =>
              actions.addNewSongByUrl(e.dataTransfer.getData('text'))
            }
          >
            {playlist.songs.length === 0 && (
              <div className="no-songs-msg">
                곡을 추가하거나 링크를 드래그해 오세요.
              </div>
            )}
            {playlist.songs.map((song, i) => (
              <div
                key={song.id}
                id={`song-${song.id}`}
                className={`song-item ${currentSong?.id === song.id ? 'active-playing' : ''}`}
                onClick={() => handlePlaySong(song, playlist)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => actions.onDrop(e, i)}
              >
                <div
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => actions.onDragStart(e, i)}
                >
                  ☰
                </div>
                <div className="song-info">
                  <img src={song.thumbnail} className="song-thumbnail" alt="" />
                  <span className="song-title-text">{song.title}</span>
                </div>
                <div
                  className="song-controls"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => actions.deleteSong(song.id)}>X</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
