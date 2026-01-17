import './PlaylistModal.css'
import type {Playlist} from '../types/playlist'
import {useState, useEffect} from 'react'

type PlaylistModalProps = {
  playlist: Playlist | null
  onClose: () => void
  onCreate: (playlist: Playlist) => void
  onUpdate: (playlist: Playlist) => void
}

export default function PlaylistModal({
  playlist,
  onClose,
  onCreate,
  onUpdate,
}: PlaylistModalProps) {
  const [title, setTitle] = useState('')
  const editMode = Boolean(playlist)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [localSongs, setLocalSongs] = useState(playlist?.songs ?? [])

  const handleSubmit = () => {
    if (!title.trim()) return

    if (editMode && playlist) {
      onUpdate({...playlist, title})
    } else {
      onCreate({
        id: Date.now().toString(),
        title,
        songs: [],
      })
    }

    onClose()
  }

  const fetchYoutubeTitle = async (url: string) => {
    try {
      const videoId = extractVideoId(url)

      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      )

      const data = await res.json()

      return data.title
    } catch (err) {
      console.error(err)
      return '제목 불러오기 실패'
    }
  }
  const extractVideoId = (url: string) => {
    if (url.includes('watch?v=')) {
      return url.split('watch?v=')[1].split('&')[0]
    }

    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split('?')[0]
    }

    return ''
  }

  const addSong = async () => {
    if (!playlist) return
    if (!youtubeUrl.trim()) return

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      alert('유효한 유튜브 링크 아님')
      return
    }

    const title = await fetchYoutubeTitle(youtubeUrl)
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    const newSong = {
      id: Date.now().toString(),
      title,
      thumbnail,
      youtubeUrl,
    }

    const updatedSongs = [...localSongs, newSong]

    setLocalSongs(updatedSongs)

    onUpdate({
      ...playlist,
      songs: updatedSongs,
    })

    setYoutubeUrl('')
  }

  useEffect(() => {
    setTitle(playlist?.title ?? '')
  }, [playlist])

  useEffect(() => {
    setLocalSongs(playlist?.songs ?? [])
  }, [playlist])

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner-left">
          <div className="modal-inner-youtube"></div>
          <input
            placeholder="이름을 입력해주세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          ></input>
          <button className="playlist-create-btn" onClick={handleSubmit}>
            {editMode ? '수정 완료' : '저장'}
          </button>
        </div>
        <div className="modal-inner-right">
          <div className="modal-inner-title">
            <p>Title</p>
            <div className="options">
              <select>
                <option>노래 추가</option>
                <option>노래 찾기</option>
              </select>
              <input
                placeholder="유튜브 링크"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              ></input>
              <button onClick={addSong}>+</button>
            </div>
          </div>
          <div className="modal-inner-list">
            {localSongs.map((song) => (
              <div key={song.id} className="song-item">
                <span>{song.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
