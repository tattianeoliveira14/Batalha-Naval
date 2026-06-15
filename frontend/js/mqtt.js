// ─────────────────────────────────────────────
//  BATALHA NAVAL — js/mqtt.js
//  Conexão com o broker MQTT via WebSocket TLS
// ─────────────────────────────────────────────

const BROKER_URL  = 'wss://batalha-naval-fd4e58b7.a01.euc1.aws.hivemq.cloud:8884/mqtt';
const BROKER_USER = 'jogador';
const BROKER_PASS = 'Batalha123456';

let client       = null;
let PLAYER_ID    = null;
let INIMIGO      = null;
let TOPICS       = {};
let inimigoReady = false;

// ── INICIALIZAR ───────────────────────────────
function initMQTT(playerId) {
  PLAYER_ID = playerId;
  INIMIGO   = playerId === 'j1' ? 'j2' : 'j1';

  TOPICS = {
    salaStatus:    'batalhanaval/sala1/status',
    meuTiro:       `batalhanaval/sala1/jogadores/${PLAYER_ID}/tiro`,
    tiroInimigo:   `batalhanaval/sala1/jogadores/${INIMIGO}/tiro`,
    meuStatus:     `batalhanaval/sala1/jogadores/${PLAYER_ID}/status`,
    inimigoStatus: `batalhanaval/sala1/jogadores/${INIMIGO}/status`,
  };

  client = mqtt.connect(BROKER_URL, {
    username: BROKER_USER,
    password: BROKER_PASS,
    clientId: `batalha_${PLAYER_ID}_${Math.random().toString(16).slice(2, 8)}`,
    clean:    true,
    will: {
      topic:   TOPICS.meuStatus,
      payload: 'OFFLINE',
      qos:     1,
      retain:  true,
    },
  });

  client.on('connect', () => {
    // Limpa mensagens retidas de jogo anterior
    client.publish(TOPICS.salaStatus,  '', { qos: 1, retain: true });
    client.publish(TOPICS.meuStatus,   '', { qos: 1, retain: true });

    // Assina todos os tópicos relevantes
    client.subscribe(TOPICS.tiroInimigo,  { qos: 1 });
    client.subscribe(TOPICS.salaStatus,   { qos: 1 });
    // Wildcard + pega status de qualquer jogador (j1 e j2)
    client.subscribe('batalhanaval/sala1/jogadores/+/status', { qos: 1 });

    // Anuncia online
    client.publish(TOPICS.meuStatus, 'ONLINE', { qos: 1, retain: true });

    // Avisa o game.js que conectou
    onMQTTConnected(PLAYER_ID);
  });

  client.on('error', (err) => {
    document.getElementById('login-status').textContent = `Erro: ${err.message}`;
  });

  client.on('reconnect', () => {
    if (document.getElementById('log')) log('Reconectando ao broker...', 'info');
  });

  // ── RECEBER MENSAGENS ────────────────────────
  client.on('message', (topic, message) => {
    const raw = message.toString();

    // Ignora mensagens vazias (limpeza de retain)
    if (!raw || raw.trim() === '') return;

    // Tiro do inimigo
    if (topic === TOPICS.tiroInimigo) {
      let payload;
      try { payload = JSON.parse(raw); } catch { return; }
      const col   = COLS[payload.x];
      const row   = ROWS[payload.y];
      const coord = `${col}${row}`;
      log(`MQTT ← tiro inimigo em ${coord}`, 'info');
      onEnemyShot(coord);
      return;
    }

    // Status da sala
    if (topic === TOPICS.salaStatus) {
      log(`MQTT ← sala: ${raw}`, 'info');
      if (raw === 'JOGANDO') {
        // Os dois estão prontos — inicia batalha
        onBothReady();
        return;
      }
      if (raw === 'FIM_J1_GANHOU') { endGame(PLAYER_ID === 'j1'); return; }
      if (raw === 'FIM_J2_GANHOU') { endGame(PLAYER_ID === 'j2'); return; }
      return;
    }

    // Status de qualquer jogador (wildcard +)
    if (topic.startsWith('batalhanaval/sala1/jogadores/') && topic.endsWith('/status')) {
      const quem = topic.includes(`/${INIMIGO}/`) ? 'inimigo' : 'eu';
      log(`MQTT ← ${quem}: ${raw}`, 'info');

      if (quem === 'inimigo') {
        if (raw === 'OFFLINE') {
          log('Inimigo desconectou!', 'bad');
          updateStatus('Inimigo desconectou — aguardando reconexão...');
          return;
        }
        if (raw === 'ONLINE') {
          log('Inimigo conectou!', 'good');
          return;
        }
        if (raw === 'PRONTO') {
          log('Inimigo terminou de posicionar!', 'good');
          inimigoReady = true;
          if (window._euPronto) mqttPublishJogando();
          return;
        }
      }
    }
  });
}

// ── PUBLICAR JOGANDO ──────────────────────────
// Publicado por quem clicar em Pronto por último
// O broker entrega pra os dois via retain → ambos iniciam a batalha
function mqttPublishJogando() {
  client.publish(TOPICS.salaStatus, 'JOGANDO', { qos: 1, retain: true });
  log('MQTT → JOGANDO publicado', 'good');
}

// ── PUBLICAR TIRO ─────────────────────────────
function mqttPublishShot(coord) {
  const x   = COLS.indexOf(coord[0]);
  const y   = ROWS.indexOf(coord[1]);
  const msg = JSON.stringify({ x, y });
  client.publish(TOPICS.meuTiro, msg, { qos: 1 });
  log(`MQTT → tiro publicado: ${coord} = ${msg}`, 'good');
}

// ── PUBLICAR PRONTO ───────────────────────────
function mqttPublishReady(ships) {
  window._euPronto = true;
  client.publish(TOPICS.meuStatus, 'PRONTO', { qos: 1, retain: true });
  log('MQTT → status PRONTO publicado', 'good');
  // Se inimigo já estava pronto, publica JOGANDO
  if (inimigoReady) mqttPublishJogando();
}

// ── PUBLICAR FIM DE JOGO ──────────────────────
function mqttPublishGameOver(winner) {
  const msg = `FIM_${winner.toUpperCase()}_GANHOU`;
  client.publish(TOPICS.salaStatus, msg, { qos: 1, retain: true });
  log(`MQTT → fim de jogo: ${msg}`, 'good');
}