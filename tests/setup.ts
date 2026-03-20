// 設定測試環境變數
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
process.env.DISCORD_REDIRECT_URI = 'http://localhost:3001/api/auth/callback';
process.env.API_PORT = '3001';
process.env.FRONTEND_URL = 'http://localhost:3000';
