# 🚢 Módulo Embarcado - Batalha Naval Distribuído

Este diretório contém a lógica de hardware e integração de rede para o projeto Batalha Naval via MQTT. O sistema utiliza um **Arduino Uno** físico atuando como interface visual de status do jogo, conectado à internet através de um script de ponte em Python.

## 🛠️ Arquitetura do Hardware

O Arduino não possui interface de rede nativa. Portanto, a comunicação obedece o seguinte fluxo:
`Nuvem (AWS HiveMQ)` <-> `Script Python (ponte_mqtt.py)` <-> `Cabo USB (Serial)` <-> `Arduino Uno`

### Componentes Utilizados
* 1x Arduino Uno R3
* 1x LED Verde (Indicador de Turno: JOGANDO)
* 1x LED Amarelo (Indicador de Espera: AGUARDANDO / ONLINE / OFFLINE)
* 3x LEDs Vermelhos (Indicadores de Vida / Game Over)
* 5x Resistores (220Ω ou 330Ω)
* Protoboard e Jumpers

### Esquema de Ligação (Pinos Digitais)
* **Pino 2:** LED Verde
* **Pino 3:** LED Amarelo
* **Pino 4:** LED Vermelho 1
* **Pino 5:** LED Vermelho 2
* **Pino 6:** LED Vermelho 3
* **GND:** Comum para todos os catodos dos LEDs.

---

## 📂 Estrutura de Arquivos

* `ponte_mqtt.py`: Script responsável por conectar ao broker MQTT via TLS (porta 8883), assinar os tópicos de status da sala e dos jogadores, e repassar as strings em formato puro para a porta serial do Arduino.
* `code_arduino/code_arduino.ino`: Firmware em C++ embarcado no microcontrolador. Ele lê a porta serial e gerencia a máquina de estados dos LEDs (incluindo o efeito visual de alarme não-bloqueante utilizando `millis()`).

---

## 🚀 Como Executar

### 1. Preparando o Microcontrolador
1. Abra o arquivo `code_arduino.ino` na Arduino IDE.
2. Selecione a placa (Arduino Uno) e a porta COM correspondente.
3. Faça o upload do código.
4. **Importante:** Feche a Arduino IDE e o Monitor Serial imediatamente após o upload para liberar a porta USB.

### 2. Iniciando a Ponte MQTT
O script Python requer a instalação das bibliotecas de comunicação serial e protocolo MQTT.

Execute no terminal:
```bash
# Instalação das dependências
pip install pyserial paho-mqtt

# Execução do script
python ponte_mqtt.py

![Imagem do arduino](<img width="1600" height="739" alt="ARDUINO" src="https://github.com/user-attachments/assets/8cd2f66b-4355-4e15-ac7e-a2eb54d501a4" />
)
