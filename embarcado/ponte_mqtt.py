import serial
import time
import paho.mqtt.client as mqtt
import ssl

# ==========================================
# CONFIGURAÇÕES OFICIAIS DO BRYAN
# ==========================================
BROKER = "batalha-naval-fd4e58b7.a01.euc1.aws.hivemq.cloud"
PORTA = 8883
USUARIO = "jogador"
SENHA = "Batalha123456"

# Tópicos de monitoramento
TOPICO_STATUS_SALA = "batalhanaval/sala1/status"
TOPICO_STATUS_PLAYERS = "batalhanaval/sala1/jogadores/+/status"

# CONFIRME A SUA PORTA COM NO GERENCIADOR DE DISPOSITIVOS
PORTA_SERIAL = "COM7" 

# ==========================================
# CONEXÃO SERIAL COM O ARDUINO
# ==========================================
try:
    arduino = serial.Serial(PORTA_SERIAL, 9600, timeout=1)
    time.sleep(3) # Tempo para o reset físico do Arduino estabilizar
    arduino.reset_input_buffer()
    arduino.reset_output_buffer()
    print("-> Sucesso: Conectado ao seu Arduino físico!")
except Exception as e:
    print(f"-> Erro Serial: Não foi possível acessar a porta {PORTA_SERIAL}.")
    exit()

# ==========================================
# EVENTOS MQTT
# ==========================================
def ao_conectar(client, userdata, flags, rc):
    if rc == 0:
        print("-> Sucesso: Conectado ao Broker do Bryan!")
        # Assina ambos os tópicos para capturar todas as mensagens da lista
        client.subscribe(TOPICO_STATUS_SALA)
        client.subscribe(TOPICO_STATUS_PLAYERS)
        print("-> Escutando strings do jogo e repassando ao hardware...")
    else:
        print(f"-> Falha na conexão. Erro código: {rc}")

def ao_receber_mensagem(client, userdata, msg):
    # Transforma o payload em texto puro
    conteudo_raw = msg.payload.decode("utf-8").strip()
    
    if conteudo_raw:
        print(f"[{msg.topic}] Repassando comando direto: {conteudo_raw}")
        # Envia a string exata com a quebra de linha que o Arduino espera (\n)
        arduino.write(f"{conteudo_raw}\n".encode())

# ==========================================
# INICIALIZAÇÃO DO CLIENTE
# ==========================================
cliente = mqtt.Client()
cliente.username_pw_set(USUARIO, SENHA)
cliente.on_connect = ao_conectar
cliente.on_message = ao_receber_mensagem
cliente.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)

print("Conectando ao servidor seguro...")
cliente.connect(BROKER, PORTA, 60)
cliente.loop_forever()