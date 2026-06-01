const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 요청 라우터에 따라 폴더를 다르게 설정
    // 예: /api/posts 수정일 때는 'editor', /api/users 수정일 때는 'profiles'
    const folder = req.baseUrl.includes('posts') ? 'editor' : 'profiles';
    const uploadPath = path.join(__dirname, '../uploads', folder);
    
    // 폴더가 없으면 생성
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });
module.exports = upload;