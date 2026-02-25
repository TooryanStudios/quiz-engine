/**
 * Creates a host room and keeps it alive.
 * Outputs the PIN so you can test joining in the browser.
 * Run: node create-room.js
 * Press Ctrl+C to stop.
 */
const { io } = require('socket.io-client');

const URL = 'http://localhost:3001';
const host = io(URL);

host.on('connect', () => {
  console.log('Host connected:', host.id);
  host.emit('host:create', { quizSlug: null });
});

host.on('room:created', (data) => {
  console.log('\n════════════════════════════════════');
  console.log('  ROOM PIN:', data.pin);
  console.log('  Open: http://localhost:3001/?pin=' + data.pin);
  console.log('  Or:   http://localhost:3001/test-join.html and enter PIN');
  console.log('════════════════════════════════════\n');
});

host.on('room:player_joined', (data) => {
  console.log('[HOST] Player joined! Players:', data.players.map(p => p.nickname).join(', '));
});

host.on('room:error', (data) => {
  console.log('[HOST] Error:', data.message);
});

host.on('disconnect', () => {
  console.log('Host disconnected');
});

// Keep alive
setInterval(() => {}, 10000);
console.log('Creating room... (Ctrl+C to stop)');
