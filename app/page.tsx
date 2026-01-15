'use client'

import {useState} from 'react'
import './page.css'
import PlaylistModal from './components/PlaylistModal'
import type {Playlist} from './types/playlist'

export default function Home() {
  const [play, setPlay] = useState(false)
  const [modal, setModal] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null)

  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const rightAlbum =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null

  return (
    <div className="main-bg">
      <div className="playlist-zone">
        {center && <div className="playlist-album-title">{center.title}</div>}
        {left && (
          <div
            className="playlist-album left"
            onClick={() =>
              setActiveIndex((prev) => {
                if (prev > 0) return prev - 1
                return prev
              })
            }
          >
            {left.songs.length > 0 ? (
              <img src={left.songs[0].thumbnail} />
            ) : (
              '곡을 추가해 주세요'
            )}
          </div>
        )}
        {center && (
          <div
            className="playlist-album center"
            onClick={() => {
              setEditPlaylist(center)
              setModal(true)
            }}
          >
            <div className="playlist-album-cover">
              {' '}
              {center.songs.length > 0 ? (
                <img src={center.songs[0].thumbnail} />
              ) : (
                '곡을 추가해 주세요'
              )}
            </div>
          </div>
        )}
        {rightAlbum ? (
          <div
            className="playlist-album right"
            onClick={() =>
              setActiveIndex((prev) => {
                if (prev < playlists.length - 1) return prev + 1
                return prev
              })
            }
          >
            {rightAlbum.songs.length > 0 ? (
              <img src={rightAlbum.songs[0].thumbnail} />
            ) : (
              '곡을 추가해 주세요'
            )}
          </div>
        ) : (
          <div
            className={`music-playlist-add ${
              playlists.length === 0 ? 'center' : 'right'
            }`}
            onClick={() => setModal(true)}
          >
            <div className="plus-btn" />
          </div>
        )}
      </div>
      {modal && (
        <PlaylistModal
          playlist={editPlaylist}
          onClose={() => {
            setModal(false)
            setEditPlaylist(null)
          }}
          onCreate={(playlist) =>
            setPlaylists((prev) => {
              const next = [...prev, playlist]
              setActiveIndex(next.length - 1)
              return next
            })
          }
          onUpdate={(updated) => {
            setPlaylists((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            )
          }}
        />
      )}
      <div className="music-var">
        {center ? (
          <div className="music-var-title">노래제목들어갈곳</div>
        ) : (
          <div className="music-var-title">플레이 리스트를 선택해주세요</div>
        )}

        <div className="progress-container">
          <div className="progress-bar"></div>
        </div>
        <audio id="audio" src="/music/sample.mp3"></audio>
        <div className="control-btns">
          <button>
            <img src={'/img/main-prevBtn.png'}></img>
          </button>
          <button onClick={() => setPlay(!play)}>
            <img
              src={play ? '/img/main-pauseBtn.png' : '/img/main-playBtn.png'}
            ></img>
          </button>
          <button>
            <img src={'/img/main-nextBtn.png'}></img>
          </button>
        </div>
      </div>
    </div>
  )
}
