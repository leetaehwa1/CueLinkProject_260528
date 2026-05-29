const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
const { findOrCreateUser } = require('../utils/userDb');

// 구글 전략
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:4000/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser({ 
        email: profile.emails[0].value, 
        nickname: profile.displayName, 
        type: 'GOOGLE',
        socialId: profile.id // 구글도 고유 ID 전달
      });
      done(null, user);
    } catch (err) { done(err); }
  }
));

// 카카오 전략
passport.use(new KakaoStrategy({
    clientID: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    callbackURL: process.env.KAKAO_REDIRECT_URI,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. 이메일 추출 (카카오 설정에 따라 없을 수 있음)
      const email = profile._json.kakao_account?.email || null;
      
      // 2. findOrCreateUser 호출 (socialId 추가)
      const user = await findOrCreateUser({ 
        email: email, 
        nickname: profile.displayName, 
        type: 'KAKAO',
        socialId: profile.id // 👈 필수: 이메일이 없을 때 PK를 고정할 고유 식별자
      });
      
      done(null, user);
    } catch (err) { 
      console.error("카카오 인증 전략 에러:", err);
      done(err); 
    }
  }
));

module.exports = passport;