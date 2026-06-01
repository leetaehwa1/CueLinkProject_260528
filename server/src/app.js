const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require("./config/db"); // 설계한 DB 설정 모듈 로드
const passport = require('passport'); // 1. 임포트!
require('./config/passport');

require('dotenv').config();


const app = express();

// 글로벌 미들웨어 설정 (Spring의 Security 및 WebMvcConfigurer 역할)
app.use(cors());
app.use(express.json());
app.use(passport.initialize())
app.use(express.urlencoded({ extended: true }));

// 뷰 엔진 및 정적 파일 경로 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 


// 2. 만약 파일이 server/uploads/editor에 있다면 이 설정이 필요합니다.
app.use('/uploads/editor', express.static(path.join(__dirname, 'uploads/editor')));
// profiles 폴더 연결
app.use('/uploads/profiles', express.static(path.join(__dirname, 'src/uploads/profiles')));


// 회원가입 및 로그인
const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);
// 게시글
const postsRouter = require("./routes/posts");
app.use('/api/posts', postsRouter);

// [MVP 관리]: 나머지 기능 개발 시 주석을 하나씩 해제합니다.
// app.use("/api/users", require("./routes/user"));
// app.use("/api/posts", require("./routes/post"));
// app.use("/api/categories", require("./routes/category"));
// app.use("/api/chats", require("./routes/chat"));
// -------------------------------------------------------------

const PORT = process.env.PORT || 4000;

// 서버 인프라 구동 프로세스
async function startServer() {
  try {
    // 1단계: 의존성의 핵심인 DB 연결 풀을 우선적으로 로드합니다.
    await db.connectDB();

    // 2단계: DB 인프라가 확보되면 포트를 열고 클라이언트 요청을 대기합니다.
    app.listen(PORT, () => {
      console.log(`🚀 [SERVER] CueLink 아키텍트 엔진 구동 완료: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ [CRITICAL] 시스템 초기화 실패. 프로세스를 안전하게 종료합니다.', err);
    process.exit(1); 
  }
}

startServer();