const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
// 파일 최상단에 미들웨어 주입 코드 확인 (없다면 추가)
const { protect } = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/posts
 * @desc    메인 SNS 피드 목록 조회 및 키워드 검색 (페이징 적용)
 * @access  Public (비로그인 유저도 접근 가능)
 */
router.get('/', async (req, res) => {
  // 1. 쿼리 스트링 파라미터 파싱 및 기본값 설정
  const keyword = req.query.keyword || '';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  
  // 오라클 페이징을 위한 offset 계산 (예: 1페이지면 offset 0, 2페이지면 offset 10)
  const offset = (page - 1) * limit;

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    let sql = '';
    const bindParams = { offset, limit };

    // SNS 피드 화면에는 글쓴이의 닉네임과 프로필 이미지가 필수적이므로 CL_USERS 테이블과 JOIN 처리합니다.
    if (keyword.trim() !== '') {
      // 2-A. 키워드 검색이 있는 경우의 쿼리
      sql = `
        SELECT p.POST_ID as "postId",
               p.USER_ID as "userId",
               u.NICKNAME as "nickname",
               u.PROFILE_IMAGE_URL as "profileImageUrl",
               p.CATEGORY_ID as "categoryId",
               p.TITLE as "title",
               TO_CHAR(p.CONTENT) as "content",
               p.VIEW_COUNT as "viewCount",
               p.IS_PROMOTION as "isPromotion",
               TO_CHAR(p.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as "createdAt"
        FROM CL_POSTS p
        JOIN CL_USERS u ON p.USER_ID = u.USER_ID
        WHERE p.DELETED_AT IS NULL
          AND (
            p.TITLE LIKE '%' || :keyword || '%'
            OR p.CONTENT LIKE '%' || :keyword || '%'
          )
        ORDER BY p.CREATED_AT DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;
      bindParams.keyword = keyword;
    } else {
      // 2-B. 기본 메인 피드 전체 조회 (최신순)
      sql = `
        SELECT p.POST_ID as "postId",
               p.USER_ID as "userId",
               u.NICKNAME as "nickname",
               u.PROFILE_IMAGE_URL as "profileImageUrl",
               p.CATEGORY_ID as "categoryId",
               p.TITLE as "title",
               TO_CHAR(p.CONTENT) as "content",
               p.VIEW_COUNT as "viewCount",
               p.IS_PROMOTION as "isPromotion",
               TO_CHAR(p.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as "createdAt"
        FROM CL_POSTS p
        JOIN CL_USERS u ON p.USER_ID = u.USER_ID
        WHERE p.DELETED_AT IS NULL
        ORDER BY p.CREATED_AT DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;
    }

    const result = await connection.execute(sql, bindParams);

    const cleanPosts = result.rows.map(row => ({
      postId: row.postId,
      userId: row.userId,
      nickname: row.nickname,
      profileImageUrl: row.profileImageUrl,
      categoryId: row.categoryId,
      title: row.title,
      content: row.content, // 이제 오라클 객체가 아닌 깨끗한 String 데이터입니다.
      viewCount: row.viewCount,
      isPromotion: row.isPromotion,
      createdAt: row.createdAt
    }));

    // 프론트엔드(Vue.js)가 사용하기 편하게 추가 Meta 데이터(현재 페이지 등)와 함께 전송
    const responseData = {
      posts: cleanPosts,
      pagination: {
        page,
        limit,
        count: result.rows.length
      }
    };

    return sendSuccess(res, '피드 목록을 성공적으로 가져왔습니다.', responseData, 200);

  } catch (err) {
    console.error('❌ [GET POSTS ERROR]:', err);
    return sendError(res, '피드를 불러오는 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
});

/**
 * @route   POST /api/posts
 * @desc    새로운 SNS 피드 게시글 작성
 * @access  Private (로그인한 유저만 가능)
 */
router.post('/', protect, async (req, res) => {
  const { categoryId, title, content, isPromotion } = req.body;
  
  // 토큰 검증 미들웨어(protect)가 req.user에 심어준 로그인 유저의 고유 ID
  const userId = req.user.userId; 

  // [유효성 검사] 필수 데이터 체크
  if (!categoryId || !title || !content) {
    return sendError(res, '카테고리, 제목, 내용은 필수 입력 항목입니다.', 'BAD_REQUEST', 400);
  }

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 오라클 시퀀스를 활용한 신규 게시글 삽입 쿼리
    // IS_PROMOTION의 경우 값이 들어오지 않으면 기본값 'N'이 적용되도록 처리합니다.
    const insertSql = `
      INSERT INTO CL_POSTS (
        POST_ID, 
        USER_ID, 
        CATEGORY_ID, 
        TITLE, 
        CONTENT, 
        IS_PROMOTION
      ) VALUES (
        SEQ_CL_POSTS.NEXTVAL, 
        :userId, 
        :categoryId, 
        :title, 
        :content, 
        :isPromotion
      )
    `;

    const bindParams = {
      userId,
      categoryId: parseInt(categoryId, 10),
      title,
      content,
      isPromotion: isPromotion || 'N'
    };

    // 쿼리 실행
    await connection.execute(insertSql, bindParams);
    
    // DB 최종 반영을 위한 명시적 커밋 처리 (Spring의 @Transactional 완료 시점과 동일)
    await connection.commit();

    return sendSuccess(res, '게시글이 성공적으로 등록되었습니다.', { userId, title }, 201);

  } catch (err) {
    console.error('❌ [CREATE POST ERROR]:', err);
    
    // 에러 발생 시 데이터 롤백 안전장치
    if (connection) {
      try { await connection.rollback(); } catch (e) {}
    }
    
    return sendError(res, '게시글 등록 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
});

/**
 * @route   PUT /api/posts/:postId
 * @desc    내가 작성한 SNS 피드 게시글 수정
 * @access  Private (작성자 본인만 가능)
 */
router.put('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const { categoryId, title, content, isPromotion } = req.body;
  const userId = req.user.userId; // 토큰에서 추출한 로그인 유저 ID

  if (!title || !content) {
    return sendError(res, '제목과 내용은 필수 입력 항목입니다.', 'BAD_REQUEST', 400);
  }

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1단계: 수정하려는 게시글이 존재하고, 내가 쓴 글이 맞는지 소유권 검증
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
    
    // [보안 가드] 로그인한 사람과 글쓴이가 다르면 403 에러로 입구컷
    if (postOwnerId !== userId) {
      return sendError(res, '이 게시글을 수정할 권한이 없습니다.', 'FORBIDDEN', 403);
    }

    // 2단계: 소유권 통과 시 실제 데이터 UPDATE 실행
    const updateSql = `
      UPDATE CL_POSTS 
      SET CATEGORY_ID = :categoryId,
          TITLE = :title,
          CONTENT = :content,
          IS_PROMOTION = :isPromotion,
          UPDATED_AT = SYSDATE
      WHERE POST_ID = :postId
    `;

    const bindParams = {
      categoryId: parseInt(categoryId, 10),
      title,
      content,
      isPromotion: isPromotion || 'N',
      postId
    };

    await connection.execute(updateSql, bindParams);
    await connection.commit(); // 영구 저장

    return sendSuccess(res, '게시글이 성공적으로 수정되었습니다.', { postId, title }, 200);

  } catch (err) {
    console.error('❌ [UPDATE POST ERROR]:', err);
    if (connection) { try { await connection.rollback(); } catch (e) {} }
    return sendError(res, '게시글 수정 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
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

/**
 * @route   GET /api/posts/:postId
 * @desc    게시글 상세 조회 (조회수 증가 + 첨부 이미지 목록 포함)
 * @access  Public (비로그인 유저도 조회 가능)
 */
router.get('/:postId', async (req, res) => {
  const { postId } = req.params;

  let connection;

  try {
    const pool = db.getPool();
    connection = await pool.getConnection();

    // 1단계: 조회수(VIEW_COUNT) 1 증가시키기
    const updateViewSql = `
      UPDATE CL_POSTS 
      SET VIEW_COUNT = VIEW_COUNT + 1 
      WHERE POST_ID = :postId AND DELETED_AT IS NULL
    `;
    await connection.execute(updateViewSql, { postId });

    // 2단계: 게시글 본문 및 작성자 정보 조회 
    // [🔥 수정 포인트 1] p.CONTENT를 TO_CHAR(p.CONTENT)로 감싸서 오라클 스트림 객체가 아닌 '순수 문자열'로 받아옵니다.
    const postSql = `
      SELECT p.POST_ID as "postId",
             p.USER_ID as "userId",
             u.NICKNAME as "nickname",
             u.PROFILE_IMAGE_URL as "profileImageUrl",
             p.CATEGORY_ID as "categoryId",
             p.TITLE as "title",
             TO_CHAR(p.CONTENT) as "content",
             p.VIEW_COUNT as "viewCount",
             p.IS_PROMOTION as "isPromotion",
             TO_CHAR(p.CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') as "createdAt"
      FROM CL_POSTS p
      JOIN CL_USERS u ON p.USER_ID = u.USER_ID
      WHERE p.POST_ID = :postId AND p.DELETED_AT IS NULL
    `;
    const postResult = await connection.execute(postSql, { postId });

    // 게시글이 존재하지 않는 경우 가드 로직
    if (postResult.rows.length === 0) {
      return sendError(res, '존재하지 않거나 이미 삭제된 게시글입니다.', 'NOT_FOUND', 404);
    }

    // [🔥 수정 포인트 2] 스프레드(...)를 쓰지 않고, 순수한 원시 값들만 쏙쏙 뽑아 완전히 새로운 독립 객체로 만듭니다.
    const row = postResult.rows[0];
    const postData = {
      postId: row.postId,
      userId: row.userId,
      nickname: row.nickname,
      profileImageUrl: row.profileImageUrl,
      categoryId: row.categoryId,
      title: row.title,
      content: row.content, // 이제 순수 문자열입니다.
      viewCount: row.viewCount,
      isPromotion: row.isPromotion,
      createdAt: row.createdAt,
      images: []
    };

    // 3단계: 해당 게시글에 첨부된 이미지 목록 조회
    const imageSql = `
      SELECT IMAGE_ID as "imageId",
             IMAGE_URL as "imageUrl",
             ORIGINAL_NAME as "originalName"
      FROM CL_POST_IMAGES
      WHERE POST_ID = :postId
      ORDER BY CREATED_AT ASC
    `;
    const imageResult = await connection.execute(imageSql, { postId });

    // 이미지 리스트도 안전하게 값만 맵핑해서 주입
    if (imageResult.rows && imageResult.rows.length > 0) {
      postData.images = imageResult.rows.map(img => ({
        imageId: img.imageId,
        imageUrl: img.imageUrl,
        originalName: img.originalName
      }));
    }

    // 업데이트와 조회가 안전하게 끝났으므로 최종 커밋
    await connection.commit();

    // 찌꺼기가 완전히 세척된 순수 postData만 전송하므로 절대로 터지지 않습니다.
    return sendSuccess(res, '게시글 상세 조회를 성공했습니다.', postData, 200);

  } catch (err) {
    console.error('❌ [GET POST DETAIL ERROR]:', err);
    if (connection) { try { await connection.rollback(); } catch (e) {} }
    return sendError(res, '게시글 상세 조회 중 서버 에러가 발생했습니다.', 'INTERNAL_SERVER_ERROR', 500);
  } finally {
    if (connection) { try { await connection.close(); } catch (e) {} }
  }
});

module.exports = router;