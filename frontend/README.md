# ⚓ Batalha Naval Multiplayer — Frontend

Interface web do projeto de Sistemas Multimídia e Distribuídos (N461).

## Estrutura de arquivos

```
frontend/
├── index.html       → estrutura da página (tabuleiros, botões, log)
├── style.css        → visual completo (tema radar militar)
├── js/
│   ├── game.js      → lógica do jogo (cliques, tiros, vitória/derrota)
│   └── mqtt.js      → conexão com o broker via WebSocket
└── assets/
    └── sounds/      → (opcional) sons de tiro e explosão
```

## Como rodar localmente

Abra o `index.html` diretamente no navegador **ou** use um servidor local:

```bash
# Com Python
python -m http.server 8080

# Com Node.js
npx serve .
```

Depois acesse `http://localhost:8080`.

## Configurar o broker MQTT

Edite o arquivo `js/mqtt.js` e preencha:

```js
const BROKER_URL  = 'wss://SEU_BROKER.hivemq.cloud:8884/mqtt';
const BROKER_USER = 'SEU_USUARIO';
const BROKER_PASS = 'SUA_SENHA';
```

Credenciais fornecidas pela **Pessoa 1** (responsável pelo broker).

## Tópicos MQTT usados

| Tópico | QoS | Descrição |
|--------|-----|-----------|
| `batalha/sala01/j1/tiro` | 1 | Jogador 1 anuncia tiro |
| `batalha/sala01/j2/tiro` | 1 | Jogador 2 anuncia tiro |
| `batalha/sala01/j1/pronto` | 1 | Jogador 1 terminou de posicionar |
| `batalha/sala01/j2/pronto` | 1 | Jogador 2 terminou de posicionar |
| `batalha/sala01/resultado` | 1 | ESP32 responde acerto ou água |
| `batalha/sala01/turno` | 1 | ESP32 anuncia de quem é o turno |
| `batalha/sala01/+/status` | 1 | Status online/offline (LWT) |

## Tecnologias

- HTML5 / CSS3 / JavaScript puro
- [MQTT.js](https://github.com/mqttjs/MQTT.js) via CDN (WebSocket)
- Fontes: Orbitron + Share Tech Mono (Google Fonts)
- Deploy: Vercel / Netlify (arquivo estático, sem backend)
