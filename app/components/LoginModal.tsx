'use client'

import {useState} from 'react'
import {createId, googleLogin, kakaoLogin, passwordLogin} from '../auth-action'

export default function LoginModal() {
  const [modal, setModal] = useState<'login' | 'signup' | null>(null)

  return (
    <div className="login-container">
      <h1 className="login-title">뮤직 플레이어</h1>

      <div className="auth-primary-actions">
        <button className="email-auth-btn" onClick={() => setModal('login')}>
          로그인
        </button>
        <button className="email-auth-btn" onClick={() => setModal('signup')}>
          회원가입
        </button>
        <form action={kakaoLogin}>
          <button className="kakao-login-btn">카카오로 시작하기</button>
        </form>
        <form action={googleLogin}>
          <button className="google-login-btn">구글로 시작하기</button>
        </form>
      </div>

      {modal === 'login' && (
        <div className="auth-modal-bg" onClick={() => setModal(null)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setModal(null)}>
              x
            </button>
            <h2>로그인</h2>
            <form action={passwordLogin}>
              <input name="email" type="email" placeholder="이메일" required />
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                required
              />
              <button type="submit">로그인</button>
            </form>
          </div>
        </div>
      )}

      {modal === 'signup' && (
        <div className="auth-modal-bg" onClick={() => setModal(null)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setModal(null)}>
              x
            </button>
            <h2>회원가입</h2>
            <form action={createId}>
              <input name="name" type="text" placeholder="이름" />
              <input name="email" type="email" placeholder="이메일" required />
              <input
                name="password"
                type="password"
                placeholder="비밀번호"
                required
              />
              <button type="submit">가입하고 시작하기</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
