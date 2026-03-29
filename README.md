# music-player
1. 프로젝트 개요
- YouTube API를 활용해 개인화된 음악 플레이리스트를 관리하는 웹 애플리케이션
- 유저별 독립적인 Playlist 환경 제공

2. 기술 스택
- Frontend: Next.js 15 (App Router), TypeScript
- Backend/ORM: Prisma, PostgreSQL (Supabase/Neon)
- Auth: Auth.js (Kakao OAuth)
- Deployment: Vercel

3. 핵심 기능
- 카카오 API를 활용한 간편 로그인 및 유저 데이터 관리
- Prisma를 활용하여 유저별 Playlist 및 노래 관계형 데이터 베이스 구축
- 실시간 Playlist/노래 추가, 삭제
- Drag & Drop 으로 노래 추가, 순서 변경

4. 아키텍처 개선 사례
 - 유튜브 iframe 제어 문제
    - 유튜브 iframe을 직접 삽입하여 유튜브 플레이어 제어
    - 영상 종료 감지 불가, 자동 다음곡 재생 불가, 백그라운드 상태 제어 불안정 등등 여러 문제점이 발생
    > 내부 플레이어가 직접 상태를 제어할 수 있는 iframe API 기반 구조로 변경 및 window.YT.Player 객체로 직접 플레이어 인스턴스 생성, 곡 종료를 감지하는 이벤트 함수를 활용
 - Next.js Middleware와 Prisma Client의 Runtime 충돌 문제
    - Next.js 미들웨어는 Edge Runtime에서 작동하지만, Prisma는 Node.js 환경이 필요하여 호환성 문제 발생.
    > auth.ts 설정을 auth.config.ts(Edge 호환)와 auth.ts(DB 연결용)로 전략적 분리하여 아키텍처 개선. 미들웨어는 가벼운 설정만 참조하게 하여 성능과 보안을 모두 확보함.

5. 협업 프로젝트에서 전체 기능 설계 및 구현 주도
- 프로젝트 초기 기본 폴더 구조와 환경 세팅을 제외한 전반적인 기능 설계 및 구현을 담당하였습니다.
로그인 기능을 포함하여 주요 핵심 로직, UI 구성, 상태 관리, API 연동을 직접 구현하였으며, 기능 단위 브랜치 전략과 커밋 컨벤션을 기반으로 Git 워크플로우를 운영하였습니다.
특히 로그인 기능 구현 과정에서 인증 흐름과 세션 관리 구조를 이해하게 되었고, 이를 통해 단순 화면 구현을 넘어 실제 서비스 동작 구조에 대한 이해도를 높일 수 있었습니다.
초기에는 Git 브랜치 전략과 커밋 관리가 익숙하지 않았지만, 협업 과정에서 충돌 해결과 이력 관리를 경험하며 체계적인 소스 코드 관리의 중요성을 실질적으로 체감하였습니다.
