// Definição dos pinos dos LEDs
const int ledVerde = 2;
const int ledAmarelo = 3;
const int ledVermelho1 = 4;
const int ledVermelho2 = 5;
const int ledVermelho3 = 6;

// Variáveis para controle do pisca-pisca de fim de jogo (sem travar o loop)
bool modoFimJogo = false;
unsigned long tempoAnterior = 0;
bool estadoPisca = LOW;

void setup() {
  pinMode(ledVerde, OUTPUT);
  pinMode(ledAmarelo, OUTPUT);
  pinMode(ledVermelho1, OUTPUT);
  pinMode(ledVermelho2, OUTPUT);
  pinMode(ledVermelho3, OUTPUT);

  // Começa tudo apagado para inicialização limpa
  digitalWrite(ledVerde, LOW);
  digitalWrite(ledAmarelo, LOW);
  digitalWrite(ledVermelho1, LOW);
  digitalWrite(ledVermelho2, LOW);
  digitalWrite(ledVermelho3, LOW);
  
  Serial.begin(9600);
}

void loop() {
  // 1. LEITURA DOS COMANDOS REAIS DO MQTT
  if (Serial.available() > 0) {
    String comando = Serial.readStringUntil('\n');
    comando.trim();

    // COMANDO: JOGANDO -> Vez de jogar
    if (comando == "JOGANDO") {
      modoFimJogo = false; // Desativa pisca-pisca se houver
      digitalWrite(ledVerde, HIGH);
      digitalWrite(ledAmarelo, LOW);
    } 
    
    // COMANDOS DE ESPERA: Sala aberta ou jogadores conectando/reconectando
    else if (comando == "AGUARDANDO_PLAYERS" || comando == "ONLINE" || comando == "OFFLINE") {
      modoFimJogo = false; 
      digitalWrite(ledVerde, LOW);
      digitalWrite(ledAmarelo, HIGH);
      // Garante as 3 vidas acesas enquanto aguarda a partida começar
      digitalWrite(ledVermelho1, HIGH);
      digitalWrite(ledVermelho2, HIGH);
      digitalWrite(ledVermelho3, HIGH);
    } 
    
    // COMANDOS DE FIM DE JOGO: Ativa o alarme nos LEDs vermelhos
    else if (comando == "FIM_J1_GANHOU" || comando == "FIM_J2_GANHOU") {
      modoFimJogo = true; // Liga o pisca-pisca nas luzes vermelhas
      digitalWrite(ledVerde, LOW);
      digitalWrite(ledAmarelo, LOW);
    }
  }

  // 2. LÓGICA DO PISCA-PISCA (Executa continuamente se o jogo tiver acabado)
  if (modoFimJogo) {
    unsigned long tempoAtual = millis();
    
    // Pisca a cada 500 milissegundos (meio segundo)
    if (tempoAtual - tempoAnterior >= 500) {
      tempoAnterior = tempoAtual;
      estadoPisca = !estadoPisca; 
      
      digitalWrite(ledVermelho1, estadoPisca);
      digitalWrite(ledVermelho2, estadoPisca);
      digitalWrite(ledVermelho3, estadoPisca);
    }
  }
}