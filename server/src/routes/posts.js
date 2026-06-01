const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { protect } = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const oracledb = require('oracledb'); // 이 줄을 추가하세요!
const { url } = require('inspector');

const uploadDir = path.join(__dirname, '../uploads/editor'); // app.js 경로와 일치하게
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 서버 라우터 추가
router.get('/categories', async (req, res) => {
  try {
    const pool = db.getPool();
    const connection = await pool.getConnection();
    const result = await connection.execute('SELECT CATEGORY_ID as "id", NAME as "name" FROM CL_CATEGORIES ORDER BY CATEGORY_ID ASC');
    await connection.close();
    return sendSuccess(res, '카테고리 조회 성공', result.rows);
  } catch (err) {
    return sendError(res, '카테고리 조회 실패', 'INTERNAL_SERVER_ERROR', 500);
  }
});

/**
 * @route   GET /api/posts
 * @desc    메인 SNS 피드 목록 조회 (이미지 포함)
 */
router.get('/', async (req, res) => {
  const keyword = req.query.keyword || '';
  const categoryId = req.query.categoryId;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  let connection;
  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    let sql = `
      SELECT p.POST_ID as "postId", p.USER_ID as "userId", u.NICKNAME as "nickname",
             p.CATEGORY_ID as "categoryId", c.NAME as "categoryName", p.TITLE as "title",
             TO_CHAR(p.CONTENT) as "content", p.VIEW_COUNT as "viewCount",
             TO_CHAR(p.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as "createdAt",
             i.IMAGE_URL as "imageUrl" 
      FROM CL_POSTS p
      JOIN CL_USERS u ON p.USER_ID = u.USER_ID
      JOIN CL_CATEGORIES c ON p.CATEGORY_ID = c.CATEGORY_ID
      LEFT JOIN CL_POST_IMAGES i ON p.POST_ID = i.POST_ID
      WHERE p.DELETED_AT IS NULL
    `;
    
    const bindParams = { offset, limit };
    if (categoryId) {
      sql += ` AND p.CATEGORY_ID = :categoryId`;
      bindParams.categoryId = parseInt(categoryId, 10);
    }
    if (keyword.trim() !== '') {
      sql += ` AND (p.TITLE LIKE '%' || :keyword || '%' OR p.CONTENT LIKE '%' || :keyword || '%')`;
      bindParams.keyword = keyword;
    }
    sql += ` ORDER BY p.CREATED_AT DESC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;

    const result = await connection.execute(sql, bindParams);
    return sendSuccess(res, '피드 목록을 가져왔습니다.', { posts: result.rows }, 200);
  } catch (err) {
    return sendError(res, '서버 에러', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) await connection.close();
  }
});

/**
 * @route   POST /api/posts
 * @desc    게시글 작성 (텍스트 전용)
 */
router.post('/', protect, upload.single('image'), async (req, res) => {
  const { categoryId, title, content, isPromotion } = req.body;
  const userId = req.user.userId;

  let connection;
  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1. 게시글 삽입
    const insertPostSql = `INSERT INTO CL_POSTS (POST_ID, USER_ID, CATEGORY_ID, TITLE, CONTENT, IS_PROMOTION) 
                           VALUES (SEQ_CL_POSTS.NEXTVAL, :userId, :categoryId, :title, :content, :isPromotion)
                           RETURNING POST_ID INTO :out_postId`;
    
    const result = await connection.execute(insertPostSql, {
      userId, categoryId: categoryId || 1, title, content, isPromotion: isPromotion || 'N',
      out_postId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    }, { autoCommit: false });

    const newPostId = result.outBinds.out_postId[0];

    // 2. 사진이 있으면 이미지 테이블에 기록
    if (req.file) {
      const insertImageSql = `INSERT INTO CL_POST_IMAGES (IMAGE_ID, POST_ID, IMAGE_URL) 
                              VALUES (SEQ_CL_POST_IMAGES.NEXTVAL, :postId, :url)`;
      await connection.execute(insertImageSql, {
        postId: newPostId,
        url: `/uploads/editor/${req.file.filename}` // <--- [핵심] app.js의 정적 경로와 매핑됨
      });
    }

    await connection.commit();
    res.status(201).json({ message: "등록 성공" });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ error: "등록 실패" });
  } finally {
    if (connection) await connection.close();
  }
});

/**
 * @route   PUT /api/posts/:postId
 * @desc    게시글 수정 (이미지 파일 포함)
 */
router.put('/:postId', protect, upload.single('image'), async (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  const userId = req.user.userId;
  const { categoryId, title, content, isPromotion } = req.body;

  let connection;
  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1. 소유권 검증
    const checkSql = `SELECT USER_ID FROM CL_POSTS WHERE POST_ID = :postId`;
    const checkResult = await connection.execute(checkSql, { postId });

    // 에러 로그에 타입을 같이 찍어보세요
const dbUserId = Number(checkResult.rows[0]?.USER_ID);
const reqUserId = Number(userId);

console.log("🔥 [권한 디버깅]:", { dbUserId, reqUserId, match: dbUserId === reqUserId });

    if (checkResult.rows.length === 0 || dbUserId !== reqUserId) {
  return sendError(res, '권한이 없습니다.', 'FORBIDDEN', 403);
}

    // 2. 게시글 본문 업데이트
    const updatePostSql = `
      UPDATE CL_POSTS 
      SET CATEGORY_ID = :categoryId, TITLE = :title, CONTENT = :content, 
          IS_PROMOTION = :isPromotion, UPDATED_AT = SYSDATE
      WHERE POST_ID = :postId
    `;
    await connection.execute(updatePostSql, {
      categoryId: parseInt(categoryId, 10) || 1,
      title,
      content,
      isPromotion: isPromotion || 'N',
      postId
    });

    // 3. 이미지 업데이트/삽입 로직
    // PUT 라우터의 이미지 처리 부분
    if (req.file) {
      const url = `/uploads/editor/${req.file.filename}`; // imagePath 대신 url 사용
      
      const checkImageSql = `SELECT IMAGE_ID FROM CL_POST_IMAGES WHERE POST_ID = :postId`;
      const imgRes = await connection.execute(checkImageSql, { postId });

      if (imgRes.rows.length > 0) {
        // 이미지 수정
        await connection.execute(
          `UPDATE CL_POST_IMAGES SET IMAGE_URL = :url WHERE POST_ID = :postId`,
          { url, postId } // 여기도 url로 변경
        );
      } else {
        // 이미지 신규 등록
        await connection.execute(
          `INSERT INTO CL_POST_IMAGES (IMAGE_ID, POST_ID, IMAGE_URL) VALUES (SEQ_CL_POST_IMAGES.NEXTVAL, :postId, :url)`,
          { postId, url } // 여기도 url로 변경
        );
      }
    }

    await connection.commit();
    return sendSuccess(res, '게시글이 수정되었습니다.', { postId,url }, 200);

  } catch (err) {
    console.error('❌ [PUT ERROR]:', err);
    if (connection) await connection.rollback();
    return sendError(res, '수정 실패', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) await connection.close();
  }
});

/**
 * @route   DELETE /api/posts/:postId
 * @desc    내가 작성한 SNS 피드 게시글 삭제 (Soft Delete 기법 적용)
 * @access  Private (작성자 본인만 가능)
 */
router.delete('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId;

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1단계: 삭제하려는 게시글 소유권 검증
    const checkSql = `
      SELECT USER_ID as "userId" 
      FROM CL_POSTS 
      WHERE POST_ID = :postId AND DELETED_AT IS NULL
    `;
    const checkResult = await connection.execute(checkSql, { postId });

    if (checkResult.rows.length === 0) {
      return sendError(res, '존재하지 않거나 이미 삭제된 게시글입니다.', 'NOT_FOUND', 404);
    }

    const postOwnerId = checkResult.rows[0].userId;

    if (postOwnerId !== userId) {
      return sendError(res, '이 게시글을 삭제할 권한이 없습니다.', 'FORBIDDEN', 403);
    }

    // 2단계: Soft Delete 처리 (DELETE 대신 UPDATE로 DELETED_AT에 날짜 기록)
    const deleteSql = `
      UPDATE CL_POSTS 
      SET DELETED_AT = SYSDATE 
      WHERE POST_ID = :postId
    `;

    await connection.execute(deleteSql, { postId });
    await connection.commit();

    return sendSuccess(res, '게시글이 성공적으로 삭제되었습니다.', { postId }, 200);

  } catch (err) {
    console.error('❌ [DELETE POST ERROR]:', err);
    if (connection) { try { await connection.rollback(); } catch (e) {} }
    return sendError(res, '게시글 삭제 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

router.post('/:postId/view', async (req, res) => {
  const postId = Number(req.params.postId);
  try {
    const pool = db.getPool();
    const connection = await pool.getConnection();
    await connection.execute(
      `UPDATE CL_POSTS SET VIEW_COUNT = VIEW_COUNT + 1 WHERE POST_ID = :postId`,
      { postId }
    );
    await connection.commit();
    await connection.close();
    return sendSuccess(res, '조회수 증가');
  } catch (err) {
    return sendError(res, '에러');
  }
});


module.exports = router;