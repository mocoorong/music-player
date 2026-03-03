import './PlaylistModal.css'

type PlaylistModalProps = {
  onClose: () => void
}

export default function PlaylistModal({onClose}: PlaylistModalProps) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner-left">
          <div className="modal-inner-youtube"></div>
          <input placeholder="이름을 입력해주세요."></input>
        </div>
        <div className="modal-inner-right">
          <div className="modal-inner-title">
            <p>Title</p>
            <div className="options">
              <select>
                <option>노래 찾기</option>
                <option>노래 검색</option>
              </select>
              <input placeholder="검색"></input>
              <button>+</button>
            </div>
          </div>
          <div className="modal-inner-list"></div>
        </div>
      </div>
    </div>
  )
}
