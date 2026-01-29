import './PlaylistModal.css'
import type {Playlist, Song} from '../types/playlist'
import {useState, useEffect} from 'react'

type PlaylistModalProps = {
  playlist: Playlist | null
  onClose: () => void
  onCreate: (playlist: Playlist) => void
  onUpdate: (playlist: Playlist) => void
  onDelete: (id: string) => void
}

export default function PlaylistModal({
  playlist,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: PlaylistModalProps) {
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [localSongs, setLocalSongs] = useState<any[]>(playlist?.songs ?? [])
  const editMode = Boolean(playlist)

  const extractVideoId = (url: string) => {
    if (url.includes('watch?v=')) return url.split('watch?v=')[1].split('&')[0]
    if (url.includes('youtu.be/'))
      return url.split('youtu.be/')[1].split('?')[0]
    return ''
  }

  const fetchYoutubeTitle = async (url: string) => {
    try {
      const videoId = extractVideoId(url)
      const res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      )
      const data = await res.json()
      return data.title || '제목 없음'
    } catch (err) {
      return '제목 불러오기 실패'
    }
  }

  const addSong = async () => {
    if (!youtubeUrl.trim()) return
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      alert('유효한 유튜브 링크가 아닙니다.')
      return
    }

    const songTitle = await fetchYoutubeTitle(youtubeUrl)
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const newSong = {
      id: Date.now().toString(),
      title: songTitle,
      thumbnail,
      youtubeUrl,
    }

    const updatedSongs = [...localSongs, newSong]
    setLocalSongs(updatedSongs)
    if (editMode && playlist) onUpdate({...playlist, songs: updatedSongs})
    setYoutubeUrl('')
  }

  const handleSubmit = () => {
    if (!title.trim() && localSongs.length === 0) {
      onClose()
      return
    }

    const finalTitle = title.trim() || '제목 없음'

    if (editMode && playlist) {
      onUpdate({...playlist, title: finalTitle, songs: localSongs})
    } else {
      onCreate({
        id: Date.now().toString(),
        title: finalTitle,
        songs: localSongs,
      })
    }
    onClose()
  }

  const deleteSong = (id: string) => {
    const updatedSongs = localSongs.filter((song) => song.id !== id)
    setLocalSongs(updatedSongs)
    if (editMode && playlist) onUpdate({...playlist, songs: updatedSongs})
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updatedSongs = [...localSongs]
    ;[updatedSongs[index - 1], updatedSongs[index]] = [
      updatedSongs[index],
      updatedSongs[index - 1],
    ]
    setLocalSongs(updatedSongs)
    if (editMode && playlist) onUpdate({...playlist, songs: updatedSongs})
  }

  const moveDown = (index: number) => {
    if (index === localSongs.length - 1) return
    const updatedSongs = [...localSongs]
    ;[updatedSongs[index + 1], updatedSongs[index]] = [
      updatedSongs[index],
      updatedSongs[index + 1],
    ]
    setLocalSongs(updatedSongs)
    if (editMode && playlist) onUpdate({...playlist, songs: updatedSongs})
  }

  useEffect(() => {
    setTitle(playlist?.title ?? '')
    setLocalSongs(playlist?.songs ?? [])
  }, [playlist])

  return (
    <div className="modal-bg" onClick={handleSubmit}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        {editMode && (
          <button
            className="playlist-delete-anchor"
            onClick={() => {
              if (confirm('이 플레이리스트를 삭제하시겠습니까?')) {
                onDelete(playlist!.id)
              }
            }}
          >
            삭제
          </button>
        )}
        <div className="modal-inner-left">
          <div className="modal-inner-youtube">
            {localSongs.length > 0 && (
              <img src={localSongs[0].thumbnail} alt="preview" />
            )}
          </div>
        </div>

        <div className="modal-inner-right">
          <div className="modal-inner-title">
            <div className="title-edit-zone">
              {isEditingTitle ? (
                <input
                  className="title-inline-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && setIsEditingTitle(false)
                  }
                  autoFocus
                />
              ) : (
                <>
                  <p className="modal-title-display">{title || '제목 없음'}</p>
                  <button
                    className="title-edit-btn"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    ✎
                  </button>
                </>
              )}
            </div>
            <div className="options">
              <select>
                <option>노래 추가</option>
              </select>
              <input
                placeholder="유튜브 링크"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSong()}
              />
              <button onClick={addSong}>+</button>
            </div>
          </div>

          <div className="modal-inner-list">
            {localSongs.map((song, index) => (
              <div key={song.id} className="song-item">
                <div className="song-info">
                  <img src={song.thumbnail} alt="" className="song-thumbnail" />
                  <span className="song-title-text">{song.title}</span>
                </div>
                <div className="song-controls">
                  <button onClick={() => moveUp(index)}>▲</button>
                  <button onClick={() => moveDown(index)}>▼</button>
                  <button
                    className="delete-btn"
                    onClick={() => deleteSong(song.id)}
                  >
                    X
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
