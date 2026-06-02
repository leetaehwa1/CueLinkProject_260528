const oracledb = require('oracledb');
require('dotenv').config();

// MyBatis처럼 결과 데이터를 기본 Array가 아닌 key-value 형태의 객체(Map)로 받기 위한 전역 설정
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

async function connectDB() {
  try {
    // Spring Boot의 HikariCP Connection Pool 생성과 동일한 작업입니다.
    pool = await oracledb.createPool({
      user: process.env.db_user,
      password: process.env.db_password,
      connectString: process.env.db_address,
      poolMax: 200, // 최대 커넥션 개수 (HikariCP의 maximum-pool-size)
      poolMin: 2,  // 최소 유지 커넥션 개수
      poolIncrement: 1
    });
    console.log('✅ [DB] Oracle Database Connection Pool이 성공적으로 생성되었습니다.');
  } catch (err) {
    console.error('❌ [DB] Connection Pool 생성 실패:', err.message);
    throw err; // 에러를 상위(app.js)로 던져 서버 구동을 차단합니다.
  }
}

// Service/Repository 단에서 쿼리를 실행할 때 커넥션을 대여하는 함수
function getPool() {
  if (!pool) {
    throw new Error('DB 연결 풀이 초기화되지 않았습니다.');
  }
  return pool;
}

module.exports = { connectDB, getPool };