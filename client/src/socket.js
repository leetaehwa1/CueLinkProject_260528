import { io } from 'socket.io-client';
// 서버가 4000번 포트에서 돌아가고 있으니 4000으로 연결합니다.
const socket = io('http://localhost:4000'); 
export default socket;