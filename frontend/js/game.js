// ─────────────────────────────────────────────
//  BATALHA NAVAL — js/game.js
//  Lógica visual do jogo (sem MQTT)
//  A comunicação MQTT fica em js/mqtt.js
// ─────────────────────────────────────────────

// ── CONFIGURAÇÕES ─────────────────────────────
const COLS        = ['A','B','C','D','E'];
const ROWS        = ['1','2','3','4','5'];
const TOTAL_SHIPS = 3;

// ── ESTADO DO JOGO ────────────────────────────
let phase       = 'login';   // 'login' | 'position' | 'battle' | 'end'
let myShips     = new Set();
let enemyShips  = new Set();
let myHits      = new Set();
let myShots     = new Set();
let pendingShot = null;
let myTurn      = false;

// ── HELPERS ───────────────────────────────────
function coordId(col, row) { return `${col}${row}`; }

function ts() {
  const d = new Date();
  return `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function log(msg, type = 'info') {
  const el    = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="ts">${ts()}</span><span class="msg">${msg}</span>`;
  el.prepend(entry);
}

function updateStatus(txt) {
  document.getElementById('status-text').textContent = txt;
}

function updateCounters() {
  document.getElementById('my-ships-count').textContent = myShips.size;
  document.getElementById('my-hits').textContent        = myHits.size;
  const shots  = [...myShots];
  const hits   = shots.filter(s => enemyShips.has(s));
  const misses = shots.filter(s => !enemyShips.has(s));
  document.getElementById('en-hits').textContent  = hits.length;
  document.getElementById('en-miss').textContent  = misses.length;
}

function cellEl(gridId, coord) {
  return document.querySelector(`#${gridId} [data-coord="${coord}"]`);
}

// ── TELA DE LOGIN ─────────────────────────────
function selectPlayer(playerId) {
  // Salva o jogador escolhido numa variável global
  window.PLAYER_ID = playerId;

  // Atualiza a tela de login com feedback
  const loginStatus = document.getElementById('login-status');
  loginStatus.textContent = `Conectando como ${playerId === 'j1' ? 'Jogador 1' : 'Jogador 2'}...`;

  // Inicializa a conexão MQTT (definida em mqtt.js)
  initMQTT(playerId);
}

// Chamada pelo mqtt.js quando a conexão for estabelecida
function onMQTTConnected(playerId) {
  // Esconde login, mostra jogo
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('game-screen').style.display  = 'block';

  // Badge do jogador no header
  const label = playerId === 'j1' ? '① Jogador 1' : '② Jogador 2';
  document.getElementById('player-badge').textContent =
    `N461 · Sistemas Multimídia e Distribuídos · MQTT · ${label}`;

  phase = 'position';
  buildGrids();
  updateStatus('POSICIONANDO NAVIOS — clique no seu tabuleiro (3 navios)');
  log(`Conectado como ${label}`, 'good');
}

// ── CONSTRUIR GRADES ──────────────────────────
function buildGrids() {
  buildGrid('my-grid',    'my-cols', 'my-rows', onMyClick);
  buildGrid('enemy-grid', 'en-cols', 'en-rows', onEnemyClick);
  document.getElementById('btn-ready').disabled = true;
  updateCounters();
}

function buildGrid(gridId, colId, rowId, clickFn) {
  const colWrap = document.getElementById(colId);
  const rowWrap = document.getElementById(rowId);

  COLS.forEach(c => {
    const s = document.createElement('span');
    s.textContent = c;
    colWrap.appendChild(s);
  });
  ROWS.forEach(r => {
    const s = document.createElement('span');
    s.textContent = r;
    rowWrap.appendChild(s);
  });

  const grid = document.getElementById(gridId);
  ROWS.forEach(row => {
    COLS.forEach(col => {
      const cell = document.createElement('div');
      cell.className     = 'cell';
      cell.dataset.coord = coordId(col, row);
      cell.addEventListener('click', () => clickFn(col, row, cell));
      grid.appendChild(cell);
    });
  });
}

// ── MEU TABULEIRO: POSICIONAR ─────────────────
function onMyClick(col, row, cell) {
  if (phase !== 'position') return;
  const coord = coordId(col, row);

  if (myShips.has(coord)) {
    myShips.delete(coord);
    cell.classList.remove('ship');
    log(`Navio removido de ${coord}`, 'info');
  } else {
    if (myShips.size >= TOTAL_SHIPS) {
      log(`Máximo de ${TOTAL_SHIPS} navios. Remova um para reposicionar.`, 'bad');
      return;
    }
    myShips.add(coord);
    cell.classList.add('ship');
    log(`Navio posicionado em ${coord}`, 'good');
  }

  updateCounters();
  document.getElementById('btn-ready').disabled = (myShips.size !== TOTAL_SHIPS);
}

// ── TABULEIRO INIMIGO: SELECIONAR TIRO ────────
function onEnemyClick(col, row, cell) {
  if (phase !== 'battle') return;
  if (!myTurn) { log('Aguarde seu turno.', 'bad'); return; }

  const coord = coordId(col, row);
  if (myShots.has(coord)) { log('Coordenada já atacada.', 'bad'); return; }

  if (pendingShot) {
    const prev = cellEl('enemy-grid', pendingShot);
    if (prev && !prev.classList.contains('hit') && !prev.classList.contains('miss')) {
      prev.style.outline = '';
    }
  }

  pendingShot = coord;
  cell.style.outline = '2px solid var(--accent2)';
  document.getElementById('pending-shot').textContent = `► ALVO SELECIONADO: ${coord}`;
  document.getElementById('btn-fire').style.display   = 'block';
  log(`Alvo selecionado: ${coord}`, 'info');
}

// ── AÇÃO: PRONTO ──────────────────────────────
function handleReady() {
  if (myShips.size !== TOTAL_SHIPS) return;
  phase = 'waiting'; // aguarda inimigo ficar pronto também

  document.getElementById('btn-ready').style.display = 'none';
  document.getElementById('ph-position').classList.replace('active', 'done');
  updateStatus('Aguardando o outro jogador posicionar...');
  log('Posicionamento confirmado. Aguardando inimigo...', 'good');

  mqttPublishReady(myShips);
}

// Chamada pelo mqtt.js quando o inimigo também ficar pronto
function onBothReady() {
  phase  = 'battle';
  // Jogador 1 começa — definição simples e clara
  myTurn = window.PLAYER_ID === 'j1';

  document.getElementById('ph-battle').classList.add('active');
  updateStatus(myTurn ? 'Seu turno — selecione uma coordenada' : 'Turno do inimigo — aguardando...');
  log('Ambos prontos! Batalha iniciada.', 'good');
}

// ── AÇÃO: CONFIRMAR TIRO ──────────────────────
function handleFire() {
  if (!pendingShot || !myTurn) return;

  const coord = pendingShot;
  const cell  = cellEl('enemy-grid', coord);

  cell.style.outline = '';
  myShots.add(coord);
  pendingShot = null;

  document.getElementById('pending-shot').textContent = '';
  document.getElementById('btn-fire').style.display   = 'none';

  myTurn = false;
  updateStatus('Tiro enviado — aguardando resposta...');
  log(`Tiro enviado em ${coord}`, 'info');

  mqttPublishShot(coord);
}

// ── RECEBER TIRO DO INIMIGO ───────────────────
function onEnemyShot(coord) {
  const cell  = cellEl('my-grid', coord);
  if (!cell) return;

  myHits.add(coord);
  const isHit = myShips.has(coord);
  cell.classList.add(isHit ? 'hit' : 'miss');
  log(`Inimigo atirou em ${coord} — ${isHit ? 'ACERTOU um navio seu!' : 'água'}`, isHit ? 'bad' : 'info');
  updateCounters();

  // Verifica derrota
  const hitsOnMe = [...myHits].filter(c => myShips.has(c));

  if (isHit) {
    // Publica que um navio foi afundado (Arduino apaga um LED vermelho)
    mqttPublishNavioAfundado();
  }

  if (hitsOnMe.length >= TOTAL_SHIPS) {
    // Publica fim de jogo — inimigo ganhou
    const winner = window.PLAYER_ID === 'j1' ? 'j2' : 'j1';
    mqttPublishGameOver(winner);
    endGame(false);
    return;
  }

  // Passa o turno para mim
  myTurn = true;
  updateStatus('Seu turno — selecione uma coordenada');
}

// ── RECEBER RESULTADO DO MEU TIRO ────────────
// Chamada pelo mqtt.js quando chega o tiro do inimigo
// No fluxo atual, o próprio JS resolve o resultado localmente
// e o ESP32 pode sobrescrever via tópico resultado
function onShotResult(coord, isHit) {
  const cell = cellEl('enemy-grid', coord);
  if (!cell) return;

  cell.classList.add(isHit ? 'hit' : 'miss');
  log(`${isHit ? 'ACERTO' : 'Água'} em ${coord}`, isHit ? 'bad' : 'info');
  updateCounters();

  const myHitsOnEnemy = [...myShots].filter(s => enemyShips.has(s));
  if (myHitsOnEnemy.length >= TOTAL_SHIPS) {
    mqttPublishGameOver(window.PLAYER_ID);
    endGame(true);
  }
}

// ── DEFINIR TURNO ─────────────────────────────
function setMyTurn(isMyTurn) {
  myTurn = isMyTurn;
  updateStatus(isMyTurn ? 'Seu turno — selecione uma coordenada' : 'Turno do inimigo — aguardando...');
}

// ── FIM DE JOGO ───────────────────────────────
function endGame(win) {
  phase = 'end';
  document.getElementById('ph-battle').classList.remove('active');
  document.getElementById('ph-end').classList.add('active', 'done');

  const overlay = document.getElementById('overlay');
  const title   = document.getElementById('overlay-title');
  overlay.classList.add('show');
  title.textContent = win ? '⚓ VITÓRIA' : '✕ DERROTA';
  title.className   = win ? 'win' : 'lose';
  log(win ? 'Jogo encerrado: VITÓRIA!' : 'Jogo encerrado: derrota.', win ? 'good' : 'bad');
}

function resetGame() { location.reload(); }