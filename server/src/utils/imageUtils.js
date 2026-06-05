// utils/imageUtils.js
export const getImageUrl = (path) => {
  if (!path) return ''; // 기본 이미지 경로
  const timestamp = new Date().getTime();
  // DB의 경로가 /uploads/editor/xxx.jpg 라면, 
  // http://localhost:4000/uploads/editor/xxx.jpg?t=123... 형태로 반환
  return `http://localhost:4000${path}?t=${timestamp}`;
};