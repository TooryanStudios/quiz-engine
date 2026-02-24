/**
 * GameState.js
 * Centralized state management for the quiz game
 */

export const state = {
  role: null,
  pin: null,
  nickname: null,
  avatar: '🎮',
  
  // Connection
  socketConnected: false,
  
  // Game flow
  questionIndex: 0,
  totalQuestions: 0,
  questionDuration: 0,
  questionStartTime: 0,
  
  // Question state
  currentQuestionType: 'single',
  hasAnswered: false,
  myAnswerIndex: -1,
  
  // Scoring
  myScore: 0,
  myStreak: 0,
  myRank: 0,
  
  // Type-specific state
  matchConnections: [],
  matchLefts: [],
  matchRights: [],
  orderItemOrder: [],
  orderItems: [],
  
  // Boss battle
  currentBoss: null,
  
  // Roles & abilities
  myRole: null,
  roleInfo: null,
  questionPlayers: [],
  roleAbilityUsed: false,
  
  // UI state
  isFrozen: false,
  isPaused: false,
  timerInterval: null,
  currentDifficulty: 'classic',
  currentJoinUrl: '',
  
  // Host-specific
  hostIsPlayer: false,
  hostCreatePending: false,
  hostPlayerStageVariant: null,
  hostPlayerStageSelection: 'auto',
  hostLobbyPlayers: [],
};

/**
 * Reset type-specific state when switching questions
 */
export function resetQuestionState() {
  state.hasAnswered = false;
  state.myAnswerIndex = -1;
  state.matchConnections = [];
  state.matchLefts = [];
  state.matchRights = [];
  state.orderItemOrder = [];
  state.orderItems = [];
  state.currentBoss = null;
  state.roleAbilityUsed = false;
  state.isFrozen = false;
}

/**
 * Update state properties
 */
export function updateState(updates) {
  Object.assign(state, updates);
}

/**
 * Get state snapshot
 */
export function getState() {
  return { ...state };
}
