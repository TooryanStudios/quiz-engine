/**
 * Automated test: simulate host + player join flow
 * Run: node test-join.js
 */
const { io } = require('socket.io-client');

const URL = 'http://localhost:3001';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== TEST: Host creates room, Player joins ===\n');

  // 1. Host connects and creates a room
  const host = io(URL);
  await new Promise(r => host.on('connect', r));
  console.log('[HOST] Connected:', host.id);

  let roomPin = null;

  host.on('room:created', (data) => {
    roomPin = data.pin;
    console.log('[HOST] Room created, PIN:', roomPin);
  });

  host.on('room:player_joined', (data) => {
    console.log('[HOST] Player joined! Players:', JSON.stringify(data.players));
  });

  host.on('room:error', (data) => {
    console.log('[HOST] ERROR:', data.message);
  });

  host.emit('host:create', { quizSlug: null });
  console.log('[HOST] Emitted host:create');

  // Wait for room creation
  await sleep(2000);
  if (!roomPin) {
    console.log('[HOST] FAIL: Room not created after 2s');
    process.exit(1);
  }

  // 2. Player connects and joins
  const player = io(URL);
  await new Promise(r => player.on('connect', r));
  console.log('\n[PLAYER] Connected:', player.id);

  player.on('room:joined', (data) => {
    console.log('[PLAYER] room:joined received!');
    console.log('[PLAYER] Data:', JSON.stringify(data, null, 2));
  });

  player.on('room:error', (data) => {
    console.log('[PLAYER] room:error:', data.message);
  });

  console.log(`[PLAYER] Emitting player:join with pin=${roomPin}`);
  player.emit('player:join', {
    pin: roomPin,
    nickname: 'TestPlayer',
    avatar: '🦊',
    playerId: 'test-' + Date.now()
  });

  // Wait for response
  await sleep(3000);

  console.log('\n=== TEST COMPLETE ===');
  host.disconnect();
  player.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
