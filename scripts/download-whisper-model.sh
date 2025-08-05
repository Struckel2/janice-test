#!/bin/bash
# Script para download direto do modelo Whisper medium
# Este script não utiliza interação do usuário e é adequado para ambientes Docker

set -e

# Configurações
MODEL_NAME="medium"
PRIMARY_MODEL_DIR="/root/.whisper-node"
# URL para o modelo GGML (formato binário compatível com whisper.cpp)
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin"

echo "=== Iniciando download do modelo Whisper $MODEL_NAME ==="

# Diretório confirmado onde o whisper-node procura o modelo
MODEL_DIR="/root/.whisper-node"

# Criar diretório
echo "Criando diretório: $MODEL_DIR"
mkdir -p "$MODEL_DIR"

# Verificar se o modelo já existe (formato GGML .bin)
if [ -f "$MODEL_DIR/ggml-$MODEL_NAME.bin" ]; then
    echo "O modelo $MODEL_NAME já existe em $MODEL_DIR/ggml-$MODEL_NAME.bin"
    # Mostrar tamanho do arquivo
    ls -lh "$MODEL_DIR/ggml-$MODEL_NAME.bin"
    exit 0
fi

# Fazer download do modelo usando curl com barra de progresso
echo "Baixando modelo $MODEL_NAME para $PRIMARY_MODEL_DIR..."
curl -L -o "$PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin" "$MODEL_URL" --progress-bar

# Verificar se o download foi bem-sucedido
if [ -f "$PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin" ]; then
    echo "Download do modelo $MODEL_NAME concluído com sucesso!"
    echo "Arquivo salvo em: $PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin"

    # Definir permissões para garantir que qualquer usuário possa ler
    chmod 644 "$PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin"

    # Exibir tamanho do arquivo
    ls -lh "$PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin"

    # Confirmar disponibilidade
    echo "Verificando disponibilidade do modelo:"
    if [ -f "$PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin" ]; then
        echo "✅ $PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin"
    else
        echo "❌ $PRIMARY_MODEL_DIR/ggml-$MODEL_NAME.bin - FALHA"
    fi
else
    echo "Erro: Falha no download do modelo $MODEL_NAME"
    exit 1
fi
