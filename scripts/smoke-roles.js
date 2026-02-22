const { io } = require('socket.io-client');

const URL = 'http://localhost:3001';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function once(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

(async () => {
  const host = io(URL, { transports: ['websocket'] });
  const p1 = io(URL, { transports: ['websocket'] });
  const p2 = io(URL, { transports: ['websocket'] });
  const p3 = io(URL, { transports: ['websocket'] });

  const sockets = [host, p1, p2, p3];
  sockets.forEach((s) => s.on('connect_error', (err) => console.error('connect_error', err.message)));

  const roleEvents = {};
  const players = [p1, p2, p3];
  const names = ['P1', 'P2', 'P3'];

  try {
    host.emit('host:create', {});
    const created = await once(host, 'room:created');
    const pin = created.pin;
    console.log('room created', pin);

    for (let i = 0; i < players.length; i++) {
      players[i].emit('player:join', { pin, nickname: names[i] });
      await once(players[i], 'room:joined');
    }

    sockets.forEach((s) => {
      s.on('game:roles', (data) => {
        roleEvents[s.id] = data;
      });
    });

    host.emit('host:start');
    await once(host, 'game:start');
    await wait(300);

    const hostRoles = roleEvents[host.id] || null;
    if (!hostRoles) throw new Error('No game:roles event observed');

    console.log('roles', hostRoles.roles);

    const reverseRole = {};
    for (const [roleName, socketId] of Object.entries(hostRoles.roles || {})) {
      if (socketId) reverseRole[socketId] = roleName;
    }

    const byId = new Map(players.map((p, idx) => [p.id, { socket: p, name: names[idx] }]));

    const scholarId = hostRoles.roles.scholarId;
    if (scholarId && byId.has(scholarId)) {
      const scholarSocket = byId.get(scholarId).socket;
      const preview = await once(scholarSocket, 'game:question_preview', 12000);
      console.log('scholar preview ok', preview.previewSeconds);
    }

    const questionPromises = sockets.map((s) => once(s, 'game:question', 12000));
    const questionPayloads = await Promise.all(questionPromises);
    const q = questionPayloads[0].question;
    console.log('question type', q.type);

    const shieldId = hostRoles.roles.shieldId;
    const saboteurId = hostRoles.roles.saboteurId;

    const targetForShield = players.find((p) => p.id !== shieldId && p.id !== saboteurId) || players[0];
    const targetForSaboteur = players.find((p) => p.id !== saboteurId) || players[0];

    if (shieldId && byId.has(shieldId)) {
      byId.get(shieldId).socket.emit('role:shield', { targetId: targetForShield.id });
    }

    if (saboteurId && byId.has(saboteurId)) {
      const freezePromise = once(targetForSaboteur, 'role:frozen', 5000).catch(() => null);
      byId.get(saboteurId).socket.emit('role:saboteur', { targetId: targetForSaboteur.id });
      const frozen = await freezePromise;
      if (frozen) {
        console.log('saboteur freeze ok', frozen.durationMs);
      } else {
        console.log('saboteur freeze not observed');
      }
    }

    const answerIdx = 0;
    players.forEach((p) => p.emit('player:answer', { questionIndex: 0, answer: { answerIndex: answerIdx } }));

    const ended = await once(host, 'question:end', 10000);
    console.log('question:end ok', {
      type: ended.questionType,
      roundScores: (ended.roundScores || []).length,
      hasPenalty: (ended.roundScores || []).some((r) => Number(r.penalty || 0) > 0),
      hasBossPayload: Boolean(ended.boss),
    });

    console.log('SMOKE PASS');
  } catch (err) {
    console.error('SMOKE FAIL', err.message);
    process.exitCode = 1;
  } finally {
    sockets.forEach((s) => s.disconnect());
    await wait(150);
  }
})();
