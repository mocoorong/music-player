'use client'

import {useState, useRef, useEffect} from 'react'
import './page.css'
import PlaylistModal from './components/PlaylistModal'
import type {Playlist, Song} from './types/playlist'

export default function Home() {
  const [play, setPlay] = useState(false)
  const [modal, setModal] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const center = activeIndex >= 0 ? playlists[activeIndex] : null
  const left = activeIndex > 0 ? playlists[activeIndex - 1] : null
  const rightAlbum =
    activeIndex < playlists.length - 1 ? playlists[activeIndex + 1] : null

  const extractVideoId = (url: string) => {
    if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0]
    if (url.includes('youtu.be/'))
      return url.split('youtu.be/')[1].split('?')[0]
    return ''
  }

  const sendYoutubeCommand = (command: 'playVideo' | 'pauseVideo') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({event: 'command', func: command, args: []}),
      '*'
    )
  }

  useEffect(() => {
    sendYoutubeCommand(play ? 'playVideo' : 'pauseVideo')
  }, [play])

  // [수정] 플레이리스트 삭제 시 재생 상태도 초기화
  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => {
      const targetIndex = prev.findIndex((p) => p.id === id)
      const nextPlaylists = prev.filter((p) => p.id !== id)

      setActiveIndex((currentIdx) => {
        if (nextPlaylists.length === 0) return -1
        if (targetIndex >= nextPlaylists.length) return nextPlaylists.length - 1
        return targetIndex
      })
      return nextPlaylists
    })

    // 삭제 시 재생 중인 노래와 상태를 초기화하여 음악이 멈추게 함
    setCurrentSong(null)
    setPlay(false)

    setModal(false)
    setEditPlaylist(null)
  }

  return (
    <div className="main-bg">
      <div
        className={`youtube-container ${modal ? 'on-modal' : 'hidden-player'}`}
      >
        {currentSong && (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${extractVideoId(currentSong.youtubeUrl)}?enablejsapi=1&autoplay=1&controls=0`}
            allow="autoplay"
            frameBorder="0"
          ></iframe>
        )}
      </div>

      <div className="playlist-zone">
        {center && <div className="playlist-album-title">{center.title}</div>}
        {left && (
          <div
            className="playlist-album left"
            onClick={() =>
              setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
            }
          >
            {left.songs.length > 0 ? (
              <img src={left.songs[0].thumbnail} alt="" />
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
              {center.songs.length > 0 ? (
                <img src={center.songs[0].thumbnail} alt="" />
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
              setActiveIndex((prev) =>
                prev < playlists.length - 1 ? prev + 1 : prev
              )
            }
          >
            {rightAlbum.songs.length > 0 ? (
              <img src={rightAlbum.songs[0].thumbnail} alt="" />
            ) : (
              '곡을 추가해 주세요'
            )}
          </div>
        ) : (
          <div
            className={`music-playlist-add ${playlists.length === 0 ? 'center' : 'right'}`}
            onClick={() => {
              setEditPlaylist(null)
              setModal(true)
            }}
          >
            <div className="plus-btn" />
          </div>
        )}
      </div>

      {modal && (
        <PlaylistModal
          playlist={editPlaylist}
          onDelete={deletePlaylist}
          onClose={() => {
            setModal(false)
            setEditPlaylist(null)
          }}
          onSelectSong={(song) => {
            setCurrentSong(song)
            setPlay(true)
          }}
          onCreate={(playlist) => {
            setPlaylists((prev) => {
              const next = [...prev, playlist]
              setActiveIndex(next.length - 1)
              return next
            })
          }}
          onUpdate={(updated) => {
            setPlaylists((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            )
          }}
        />
      )}

      <div className="music-var">
        <div className="music-var-title">
          {currentSong ? currentSong.title : '플레이 리스트를 선택해주세요'}
        </div>
        <div className="control-btns">
          <button>
            <img src={'/img/main-prevBtn.png'} alt="prev" />
          </button>
          <button onClick={() => setPlay(!play)}>
            <img
              src={play ? '/img/main-pauseBtn.png' : '/img/main-playBtn.png'}
              alt="play"
            />
          </button>
          <button>
            <img src={'/img/main-nextBtn.png'} alt="next" />
          </button>
        </div>
      </div>
    </div>
  )
}
