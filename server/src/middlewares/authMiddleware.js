const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

/**
 * [Spring Boot 멘탈 모델 매핑]
 * Spring Security의 OncePerRequestFilter 또는 HandlerInterceptor의 preHandle 역할입니다.
 * 컨트롤러에 도달하기 전 Header의 JWT 토큰을 가로채서 검증합니다.
 */
const protect = async (req, res, next) => {

  let token;

  // 1단계: HTTP 요청 헤더에서 Authorization 값 추출 (컨벤션 표준인 'Bearer 토큰' 형태 검증)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 헤더 분리: "Bearer eyJhbGciOi..." -> ["Bearer", "eyJhbGciOi..."] -> 토큰만 획득
      token = req.headers.authorization.split(' ')[1];

      // 2단계: 복호화 및 검증 (서명 위조 여부 및 만료 시간 확인)
      // 토큰이 유효하면 페이로드(userId, email, userType)가 디코딩됩니다.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("🔥 [디버깅] 복호화된 토큰 내부 값:", decoded); // <--- 이 줄 추가!

      // 3단계: Request 객체에 유저 정보 바인딩 (Spring의 SecurityContextHolder에 인증 객체를 넣는 것과 동일)
      // 이렇게 해두면 이 미들웨어를 거치는 다음 후속 라우터들에서 req.user.userId로 로그인한 유저를 바로 식별합니다.
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        userType: decoded.userType
      };

      // 4단계: 보안 검색대 통과! 다음 비즈니스 로직(컨트롤러)으로 진행하라는 명령
      next();

    } catch (err) {
      console.error('❌ [AUTH MIDDLEWARE ERROR]:', err.message);
      
      // 토큰은 보냈으나 유효기간이 만료되었거나 서명이 위조된 엣지 케이스 처리
      if (err.name === 'TokenExpiredError') {
        return sendError(res, '인증 토큰의 유효기간이 만료되었습니다.', 'TOKEN_EXPIRED', 401);
      }
      return sendError(res, '유효하지 않은 인증 토큰입니다.', 'INVALID_TOKEN', 401);
    }
  }

  // 헤더에 Authorization 자체가 없는 상태로 접근한 경우 입구컷 (401 Unauthorized)
  if (!token) {
    return sendError(res, '인증 토큰이 누락되었습니다. 접근 권한이 없습니다.', 'UNAUTHORIZED', 401);
  }
};

module.exports = { protect };