#!/bin/bash
set -e

echo "🚀 Starting Jul.IA - Petição Inicial Empréstimo Consignado"

# Instalar dependências Python
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Instalar LibreOffice para conversão PDF
echo "📄 Installing LibreOffice..."
apt-get update && apt-get install -y libreoffice || echo "⚠️ LibreOffice installation skipped"

# Criar pasta out se não existir
mkdir -p python_backend/out

# Iniciar servidor Python
echo "🐍 Starting Python server on port 8013..."
cd python_backend
uvicorn main:app --host 0.0.0.0 --port 8013
