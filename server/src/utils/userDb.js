const db = require('../config/db');

// socialId 인자를 추가했습니다.
async function findOrCreateUser({ email, nickname, type, socialId }) {
  let connection;
  try {
    // 💡 핵심: 이메일이 없으면 socialId를 사용하여 고정된 PK 생성
    // 이렇게 하면 매번 로그인해도 똑같은 이메일이 만들어져 중복 가입이 방지됩니다.
    if (!email && socialId) {
      email = `${type.toLowerCase()}_${socialId}@cuelink.temp`;
      console.log(`✅ 카카오 고유 ID로 이메일(PK) 고정 생성: ${email}`);
    }

    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1. 유저 조회
    const selectSql = `SELECT * FROM CL_USERS WHERE EMAIL = :email`;
    const result = await connection.execute(selectSql, { email });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        userId: row.USER_ID,
        email: row.EMAIL,
        userType: row.USER_TYPE,
        nickname: row.NICKNAME
      };
    }

    // 2. 신규 유저 등록
    // 유저 타입이 제약조건(CK)에 걸리지 않도록 'USER'로 통일하거나, DB 제약조건을 확인하세요.
    const finalNickname = `${nickname}_${Math.floor(Math.random() * 9000) + 1000}`;

    const insertSql = `
      INSERT INTO CL_USERS (USER_ID, EMAIL, NICKNAME, USER_TYPE, PASSWORD)
      VALUES (SEQ_CL_USERS.NEXTVAL, :email, :nickname, 'USER', 'SOCIAL_LOGIN')
    `;
    
    await connection.execute(insertSql, { email, nickname: finalNickname });
    await connection.commit();

    // 3. 저장된 유저 다시 조회
    const finalResult = await connection.execute(selectSql, { email });
    const userRow = finalResult.rows[0];
    
    return {
        userId: userRow.USER_ID,
        email: userRow.EMAIL,
        userType: userRow.USER_TYPE,
        nickname: userRow.NICKNAME
    };
  } catch (err) {
    console.error("❌ findOrCreateUser 에러:", err);
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { findOrCreateUser };