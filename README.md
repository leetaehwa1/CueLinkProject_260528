# 🎱 CueLink (큐링크)

> **"당구 테이블 위의 나, 우리의 모든 순간을 잇다"**

당구인들을 위한 실시간 소통 커뮤니티 SNS입니다.  
경기 기록을 공유하고, 실시간 채팅으로 당구장 정보를 나누며, 취향이 맞는 당구인들과 소통할 수 있습니다.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![Oracle DB](https://img.shields.io/badge/Oracle-Database-F80000?logo=oracle)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-010101?logo=socket.io)

<p align="center">
  <img src="./screenshot/cuelink-main.png" width="49%" />
  <img src="./screenshot/cuelink-chat.png" width="48%" />
</p>

---

## 💡 프로젝트 소개

**CueLink**는 당구 라이프를 기록하고 공유하는 당구 전문 SNS 플랫폼입니다. 
당구 경기 기록, 득점 포인트, 당구장 소식 등 당구인들에게 특화된 소통 공간을 제공합니다.

### 핵심 컨셉

- **당구 SNS 피드**: 경기 모습과 득점 기록을 사진과 함께 공유
- **실시간 소통**: Socket.io 기반 실시간 채팅 및 알림 시스템
- **인증 시스템**: JWT 및 OAuth 2.0(구글/카카오)을 통한 안전하고 간편한 로그인
- **데이터 기반**: Oracle DB를 활용한 안정적인 게시물 및 회원 정보 관리

---

## 🎯 프로젝트 특징

### 기술적 특징

| 특징 | 설명 |
| :--- | :--- |
| **실시간 양방향 통신** | Socket.io를 활용한 실시간 채팅 및 알림 시스템 |
| **강력한 인증 보안** | JWT 토큰 기반 인증 및 Passport.js를 활용한 OAuth 2.0 |
| **관계형 DB 관리** | Oracle DB를 통한 데이터 무결성 보장 |
| **비동기 처리** | Express 미들웨어를 활용한 효율적인 요청 처리 및 트랜잭션 제어 |

### 사용자 경험 특징

- **당구 특화 피드**: 경기 기록 중심의 피드 레이아웃
- **즉각적인 반응**: 좋아요 토글 및 댓글 실시간 반영
- **소셜 로그인**: 구글/카카오 연동으로 가입 절차 간소화
- **반응형 UI**: 모바일과 데스크탑 어디서든 편한 당구 정보 확인

---

## 🛠 사용 기술

### Frontend
| 기술명 | 설명 |
| :--- | :--- |
| ![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=white) | React 19.x - 컴포넌트 기반 UI 개발 |
| ![Material-UI](https://img.shields.io/badge/Material--UI-007FFF?logo=mui&logoColor=white) | 당구장 느낌을 반영한 커스텀 UI 디자인 |
| ![Axios](https://img.shields.io/badge/Axios-5A29E4?logo=axios&logoColor=white) | 백엔드와 데이터 통신 |

### Backend
| 기술명 | 설명 |
| :--- | :--- |
| ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white) | 이벤트 기반 비동기 서버 엔진 |
| ![Oracle](https://img.shields.io/badge/Oracle-F80000?logo=oracle&logoColor=white) | 신뢰도 높은 엔터프라이즈급 데이터 저장소 |
| ![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white) | 실시간 채팅 및 매칭 시스템 |
| ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white) | 무상태 인증 시스템 구현 |

---

## 📄 주요 기능

### 🎱 당구 SNS 피드
- 경기 기록 및 사진 업로드 (Multer 활용)
- 좋아요 및 답글 기능
- 삭제/수정 등 게시글 CRUD

### 💬 실시간 채팅
- 방 단위 채팅 및 개인별 채팅 지원
- 접속 상태 및 메시지 알림

### 🔑 회원 관리
- 이메일 인증 기능 (Nodemailer)
- 소셜 로그인 연동 (Google/Kakao)
- 프로필 이미지 관리

---
### 환경 변수 설정

**backend/.env**
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

JWT_SECRET=CueLink_Senior_Secret_Key_2026
db_user = root
db_password = your_password
db_address = localhost

NODE_ENV=development

GOOGLE_CLIENT_ID=your_key
GOOGLE_CLIENT_SECRET=your_secret_key

KAKAO_CLIENT_ID=your_key
KAKAO_CLIENT_SECRET=your_secret_key
KAKAO_REDIRECT_URI=http://localhost:4000/api/auth/kakao/callback
```
**frontend/.env**

```env
REACT_APP_API_BASE_URL=http://localhost:5173
```

---
## 📁 프로젝트 구조

```text
CueLinkProject/
├── client/                 # 프론트엔드 (React + Vite)
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── api/            # API 통신 관련
│   │   ├── assets/         # 정적 자산
│   │   ├── components/     # UI 재사용 컴포넌트
│   │   ├── pages/          # 페이지 단위 컴포넌트
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── socket.js       # 소켓 클라이언트 설정
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
├── server/                 # 백엔드 (Node.js + Express)
│   ├── node_modules/
│   ├── src/
│   │   ├── config/         # DB 및 설정 파일
│   │   ├── controllers/    # 요청 처리 컨트롤러
│   │   ├── middlewares/    # 인증 및 검증 미들웨어
│   │   ├── routes/         # API 라우팅
│   │   ├── services/       # 비즈니스 로직
│   │   ├── sockets/        # 소켓 이벤트 핸들러
│   │   ├── uploads/        # 파일 업로드 저장소
│   │   ├── utils/          # 공통 유틸리티
│   │   └── app.js          # 서버 진입점
│   ├── uploads/            # 서버 업로드 데이터
│   ├── .env                # 환경 변수
│   ├── package-lock.json
│   ├── package.json
│   └── .gitignore
├── dbBackup/               # 데이터베이스 백업 폴더
└── docs/                   # 프로젝트 관련 문서

---

# 📚 상세 문서

[상세 프로젝트 명세 문서](https://docs.google.com/document/d/1TmgM4B9T7QA5KvR6MhtyxrbIz7alJ51B90M1IFc4m7o/edit?usp=sharing)

---
