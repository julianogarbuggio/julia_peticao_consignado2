#!/bin/bash
set -e

echo "🚀 Starting Jul.IA - Petição Inicial Empréstimo Consignado"

# Instalar dependências Python
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Criar pasta out se não existir
mkdir -p python_backend/out

# Iniciar servidor Python
echo "🐍 Starting Python server on port 8013..."
cd python_backend
uvicorn main:app --host 0.0.0.0 --port 8013
