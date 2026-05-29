const nodemailer = require('nodemailer');

// 1. 구글 SMTP 서버 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS 사용
  auth: {
    user: 'ock965@gmail.com', // 👈 본인의 진짜 Gmail 주소 입력
    pass: 'degnclfzgsittenc'  // 👈 공백 없이 16자리 붙여넣기
  }
});

// 2. 메일 발송 공통 함수
const sendVerificationMail = async (toEmail, code) => {
  const mailOptions = {
    from: `"CueLink" <ock965@gmail.com>`, // 👈 발신자 이름 설정
    to: toEmail,
    subject: '[CueLink] 회원가입 이메일 인증번호입니다.',
    html: `
      <div style="max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; font-family: sans-serif;">
        <h2 style="color: #00796b; text-align: center;">🎱 CueLink 회원가입 인증</h2>
        <p style="font-size: 16px; color: #333;">안녕하세요. CueLink SNS에 가입해 주셔서 감사합니다.</p>
        <p style="font-size: 14px; color: #666;">아래의 6자리 인증번호를 회원가입 화면에 입력해 주세요.</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #00796b; border-radius: 4px; margin: 20px 0;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #999; text-align: center;">본 인증번호는 3분간 유효합니다.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationMail };