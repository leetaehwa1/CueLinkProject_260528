const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require("./config/db"); // 설계한 DB 설정 모듈 로드
const passport = require('passport'); // 1. 임포트!
require('./config/passport');

const http = require('http'); // 1. http 모듈 추가
const { Server } = require('socket.io'); // 2. socket.io 추가

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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 회원가입 및 로그인
const authRouter = require("./routes/auth");
app.use("/api/auth", authRouter);
// 게시글
const postsRouter = require("./routes/posts");
app.use('/api/posts', postsRouter);
// 프로필
const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
// 팔로우 기능
const followsRoutes = require('./routes/follows')
app.use('/api/follows', followsRoutes);
// 채팅 기능
const chatRoutes = require('./routes/chats')
app.use('/api/chats', chatRoutes);
// 3. 서버 객체 생성 (app을 http 서버로 래핑)
const server = http.createServer(app);

// 4. Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // 프론트엔드 주소
    methods: ["GET", "POST"]
  }
});

// 5. 소켓 이벤트 로직
io.on('connection', (socket) => {
  console.log('⚡ 유저 접속:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`유저가 방에 입장함: ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    let connection;
    try {
      const pool = db.getPool();
      connection = await pool.getConnection();

      // --- [2] 보낸 사람 정보 조회 (닉네임/프로필 표시용) ---
      const userSql = `SELECT NICKNAME, PROFILE_IMAGE_URL FROM CL_USERS WHERE USER_ID = :id`;
      const userResult = await connection.execute(userSql, [data.senderId]);
      
      const enrichedData = {
        ...data,
        NICKNAME: userResult.rows.length > 0 ? userResult.rows[0].NICKNAME : '알 수 없음',
        PROFILE_IMAGE_URL: userResult.rows.length > 0 ? userResult.rows[0].PROFILE_IMAGE_URL : null,
        CREATED_AT: new Date()
      };
      
      // --- [3] 같은 방에 있는 사람들에게 실시간 전송 ---
      io.to(data.roomId).emit('receive_message', enrichedData);
      
    } catch (err) {
      console.error("소켓 처리 오류:", err);
      if (connection) await connection.rollback();
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  });
}); 

// [MVP 관리]: 나머지 기능 개발 시 주석을 하나씩 해제합니다.
// app.use("/api/users", require("./routes/user"));
// app.use("/api/posts", require("./routes/post"));
// app.use("/api/categories", require("./routes/category"));
// app.use("/api/chats", require("./routes/chat"));
// -------------------------------------------------------------

const PORT = process.env.PORT || 4000;

// 기존 startServer 함수 수정
async function startServer() {
  try {
    await db.connectDB();

    // app.listen이 아니라 server.listen을 사용해야 합니다!
    server.listen(PORT, () => {
      console.log(`🚀 [SERVER] CueLink 아키텍트 엔진 구동 완료: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ [CRITICAL] 시스템 초기화 실패', err);
    process.exit(1); 
  }
}

startServer();