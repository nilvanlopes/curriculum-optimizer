#!/bin/bash
# Script para testar todos os comandos com test-vaga.md
# 
# IMPORTANTE: Este script requer Node.js instalado no WSL
# Se encontrar erro "node: command not found", instale o Node.js:
#   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
#   sudo apt-get install -y nodejs
# 
# Ou use nvm:
#   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
#   nvm install 20
#   nvm use 20

set -e  # Para em caso de erro

# Verifica se node está disponível
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js não encontrado no PATH do WSL"
    echo "Por favor, instale o Node.js no WSL primeiro"
    exit 1
fi

# Verifica se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "ERRO: npm não encontrado no PATH do WSL"
    echo "Por favor, instale o Node.js no WSL primeiro"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

echo "=========================================="
echo "TESTE 1: Analisar vaga"
echo "=========================================="
npm run dev -- analyze --job-file test-vaga.md

echo ""
echo "=========================================="
echo "TESTE 2: Gerar currículo otimizado (tech-lead)"
echo "=========================================="
npm run dev -- generate --job-file test-vaga.md --role "Tech Lead Frontend" --output-name test-tech-lead

echo ""
echo "=========================================="
echo "TESTE 3: Gerar currículo otimizado (senior-frontend)"
echo "=========================================="
npm run dev -- generate --job-file test-vaga.md --role "Senior Frontend Developer" --output-name test-senior-frontend

echo ""
echo "=========================================="
echo "TESTE 4: Gerar currículo otimizado (fullstack)"
echo "=========================================="
npm run dev -- generate --job-file test-vaga.md --role "Fullstack Developer" --output-name test-fullstack

echo ""
echo "=========================================="
echo "TESTE 5: Comparar salários (valores da vaga)"
echo "=========================================="
npm run dev -- salary-compare --clt 16000 --pj 19500 --benefits "VR:1000,VT:0,Saude:600,PLR:25%"

echo ""
echo "=========================================="
echo "TESTE 6: Validar PDF gerado"
echo "=========================================="
if [ -f "output/test-tech-lead.pdf" ]; then
    npm run dev -- validate output/test-tech-lead.pdf
else
    echo "PDF não encontrado, pulando validação"
fi

echo ""
echo "=========================================="
echo "TESTE 7: Gerar apenas HTML"
echo "=========================================="
npm run dev -- generate --job-file test-vaga.md --role "Tech Lead Frontend" --output-name test-html-only --format html

echo ""
echo "=========================================="
echo "TESTE 8: Gerar apenas PDF"
echo "=========================================="
npm run dev -- generate --job-file test-vaga.md --role "Tech Lead Frontend" --output-name test-pdf-only --format pdf

echo ""
echo "=========================================="
echo "TESTE 9: Gerar apenas Markdown"
echo "=========================================="
npm run dev -- generate --job-file test-vaga.md --role "Tech Lead Frontend" --output-name test-markdown-only --format markdown

echo ""
echo "=========================================="
echo "Todos os testes concluídos!"
echo "=========================================="
