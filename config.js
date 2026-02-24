/**
 * Centralized configuration for QYan.
 * Change DOMAIN here when moving to a new server or subdomain.
 */
module.exports = {
  PORT: process.env.PORT || 3001,

  // The public-facing domain for this service.
  // Update this when moving from PoC to production.
  DOMAIN: process.env.DOMAIN || 'play.qyan.app',

  // CORS: allow connections from these origins
  CORS_ORIGINS: [
    'https://play.qyan.app',
    'https://quizengine.onrender.com',
    'https://tailorjoin.khuyoot.app',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ],

  // Game settings
  GAME: {
    QUESTION_DURATION_SEC: 30,   // Seconds per question
    LEADERBOARD_DURATION_MS: 5000, // How long to show leaderboard between questions (ms)
    PIN_LENGTH: 6,               // Digits in room PIN
  },
};
