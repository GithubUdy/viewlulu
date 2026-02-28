# ViewLulu (AI Beauty Assistant)

## 📌 프로젝트 소개
- 시각장애인을 위한 AI 기반 뷰티 매니저 앱
- 화장품 등록 및 조회
- 화장품 인식 AI
- 얼굴형 검사 AI

## 🌐 기술 스택
- Runtime : Node.js
- Framework : Express.js

## 🛠 주요 역할
- REST API 라우팅
- AI 서버 요청 전달 (Forwarding)
- 에러 핸들링
- 응답 포맷 통일
- 요청 로깅

## 🧠 아키텍처
React Native → Node Proxy → FastAPI AI 서버

## 📱 주요 기능
- 음성으로 화면 이동
- 화장품 등록/삭제
- AI 얼굴형 분석
- 화장품 인식

## 🔥 트러블슈팅
- 노드 서버
  - Python 서버 응답 지연 문제
    - Node 서버에서 AI 서버로의 요청이 순차적으로 처리됨
    - 비동기 처리 구조가 명확하지 않아 응답 대기열 발생
    - asynce/await 기반 비동기 구조 재정비를 통해 개선
    - 요청 처리 흐름 분리(request -> forwarding -> response 단계 분리)를 통해 개선
    - 타임아웃 및 예외 처리 로직 추가로 개선
  
  - 대용량 이미지 요청 처리 문제
    - 모바일 원본 이미지 전송 시 요청 용량 증가로 인해 응답 속도 저하 발생
    - 요청 크기 제한 설정, 이미지 리사이징, Python 서버 전달 전 불필요 데이터 제거로 개선

- 파이썬 서버
  - 모델 요청마다 재로딩 되는 문제
    - API 요청 시 PyTorch 모델을 로딩하는 구조
    - 매 요청 시마다 새로 모델을 로딩하는 현상 발생
    - 서버 시작 시에 모델을 로딩하는 구조로 개선
  - 이미지 업로드 처리 오류
    - 모바일에서 업로드한 이미지가 PIL에서 열리지 않거나 에러가 발생
    - 잘못된 MIME 타입, 이미지 스트림 처리 방식의 오류
    - UploadFile을 bytes로 읽은 후 PIL 변환 구조로 개선
    - 입력 전처리 함수 분리, Resize / Normalize 명확히 처리

- 안드로이드
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
- 노드 서버
   - npm install
   - npm run dev

- 파이썬 서버
   - pip install -r requirements.txt
   - uvicorn main:app --reload --port 8000

- 앱
   - npm install
   - npx react-native run-android
