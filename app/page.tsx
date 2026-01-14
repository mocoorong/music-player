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
            onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
          >
            첫 곡 썸네일
          </div>
        )}
        {center && (
          <div className="playlist-album center">
            <div className="playlist-album-cover">첫 곡 썸네일</div>
          </div>
        )}
        {rightAlbum ? (
          <div
            className="playlist-album right"
            onClick={() =>
              setActiveIndex((prev) => Math.min(prev + 1, playlists.length - 1))
            }
          >
            첫 곡 썸네일
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
          onClose={() => setModal(false)}
          onCreate={(playlist) =>
            setPlaylists((prev) => {
              const next = [...prev, playlist]
              setActiveIndex(next.length - 1)
              return next
            })
          }
        />
      )}
      <div className="music-var">
        <div className="music-var-title">노래 제목 들어갈 곳</div>
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
