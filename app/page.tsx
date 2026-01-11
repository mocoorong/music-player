'use client'

import {useState} from 'react'
import './page.css'

export default function () {
  const [play, setPlay] = useState(false)

  return (
    <div className="main-bg">
      <div className="music-playlist-add">
        <div className="plus-btn"></div>
      </div>
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
