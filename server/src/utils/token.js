// server/src/utils/token.js
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  // 공통 페이로드 구성
  console.log("토큰 생성 직전 유저 정보:", user);
  const payload = {
    userId: user.userId, // 일반 로그인의 user.userId, 구글 로그인의 user.id 등
    email: user.email,
    userType: user.userType || 'USER'
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = { generateToken };