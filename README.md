# ViewLulu (AI Beauty Assistant)

## 📌 프로젝트 소개
- 시각장애인을 위한 AI 기반 뷰티 매니저 앱
- STT 기반 음성 제어
- 화장품 인식 AI
- 얼굴형 검사 AI

## 🛠 기술 스택
- React Native
- FastAPI
- Whisper STT
- PyTorch

## 🧠 아키텍처
React Native → Node Proxy → FastAPI AI 서버

## 📱 주요 기능
- 음성으로 화면 이동
- 화장품 등록/삭제
- AI 얼굴형 분석
- 화장품 인식

## 🔥 트러블슈팅
- Android 15 (16KB Page Size) 이슈 분석
  - Android 15부터 16KB page size 지원 요구
  - NDK 27 및 라이브러리 재빌드 필요 확인
  - 현재 TensorFlow Lite 및 일부 네이티브 모듈 충돌 발생
  - 대응 전략 설계 중 (NDK 버전 업그레이드 및 재빌드 예정)

- STT 인식 지연 문제 해결
  - Whisper inference latency 발생
  - Node Proxy에서 요청 병렬 처리 구조로 개선

- TTS 중복 실행 방지
  - announceScreen 중복 호출 이슈
  - useRef 기반 상태 관리로 해결

## 📦 실행 방법
npm install
npx react-native run-android
