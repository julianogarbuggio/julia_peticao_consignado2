# Jul.IA - Petição Inicial Empréstimo Consignado

**Plataforma Inteligente de Petições** - Automação jurídica para geração de petições iniciais de empréstimo consignado.

![Jul.IA](https://img.shields.io/badge/Jul.IA-Automação%20Jurídica-0D99FF)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.13-green)
![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688)

---

## 📋 Sobre o Projeto

Jul.IA é uma plataforma web desenvolvida para automatizar a criação de petições iniciais de empréstimo consignado, consolidando contratos, PROCON e tutela em um único fluxo. O sistema oferece:

- ✅ **Endereçamento inteligente** com seleção de estados e cidades
- ✅ **Parser automático** de dados da parte autora
- ✅ **Busca de CNPJ** com fallback entre múltiplas APIs
- ✅ **Tabela de contratos** com cálculos automáticos de valores pagos em dobro
- ✅ **Geração de DOCX e PDF** a partir de templates personalizados

---

## 🚀 Tecnologias Utilizadas

### Backend
- **Python 3.11** - Servidor principal e geração de documentos
- **FastAPI** - Framework web assíncrono
- **python-docx** - Manipulação de arquivos DOCX
- **LibreOffice** - Conversão de DOCX para PDF

### Frontend
- **Node.js 22.13** - Servidor proxy e desenvolvimento
- **Express 4** - Servidor HTTP
- **Vanilla JavaScript** - Interface do usuário
- **Montserrat Font** - Tipografia

### APIs Externas
- **BrasilAPI** - Busca de CNPJ (primária)
- **ReceitaWS** - Busca de CNPJ (fallback)

---

## 📦 Estrutura do Projeto

```
julia_peticao_consignado/
├── python_backend/          # Servidor Python (FastAPI)
│   ├── main.py             # Servidor principal
│   ├── static/             # Arquivos estáticos (HTML, JSON)
│   │   ├── peticao_consignado.html
│   │   └── estados_cidades.json
│   ├── templates/          # Templates DOCX
│   │   └── template_peticaoconsig.docx
│   └── out/                # Documentos gerados
├── server/                  # Servidor Node.js (proxy)
│   └── _core/
│       ├── index.ts        # Servidor Express
│       └── staticRoutes.ts # Rotas estáticas e proxy
├── client/                  # Frontend (não usado atualmente)
├── start_python_server.sh   # Script de inicialização
├── requirements.txt         # Dependências Python
└── package.json            # Dependências Node.js
```

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- **Python 3.11+**
- **Node.js 22.13+**
- **LibreOffice** (para conversão PDF)
- **pnpm** (gerenciador de pacotes Node.js)

### Passo 1: Clonar o Repositório

```bash
git clone https://github.com/SEU_USUARIO/julia_peticao_consignado.git
cd julia_peticao_consignado
```

### Passo 2: Instalar Dependências Python

```bash
pip install -r requirements.txt
```

### Passo 3: Instalar Dependências Node.js

```bash
pnpm install
```

### Passo 4: Instalar LibreOffice (para conversão PDF)

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y libreoffice
```

**macOS:**
```bash
brew install --cask libreoffice
```

**Windows:**
Baixe e instale de [libreoffice.org](https://www.libreoffice.org/)

---

## 🏃 Como Executar

### Desenvolvimento Local

O projeto usa um script que inicia **dois servidores simultaneamente**:

1. **Servidor Python** (porta 8013) - Geração de documentos
2. **Servidor Node.js** (porta 3000) - Interface web e proxy

```bash
pnpm dev
```

Acesse: **http://localhost:3000**

### Produção

```bash
pnpm start
```

---

## 🌐 Deploy no Railway

### Opção 1: Deploy via GitHub

1. Faça push do código para o GitHub
2. Conecte o repositório no [Railway](https://railway.app)
3. Configure as variáveis de ambiente (se necessário)
4. Deploy automático!

### Opção 2: Deploy via CLI

```bash
railway login
railway init
railway up
```

---

## 📝 Como Usar

### 1. Endereçamento da Peça

- Selecione o **Estado (UF)** no dropdown
- Escolha a **Cidade** nas sugestões ou digite manualmente
- Selecione o **Tipo de Órgão** (Vara Cível, Juizado Especial, etc.)
- Veja a **prévia** do endereçamento formatado

### 2. Dados da Parte Autora

- Cole o **TXT do formulário** no formato:
  ```
  Nome completo: MARIA DA SILVA
  Nacionalidade: Brasileira
  Data de nascimento: 01/01/1980
  Estado civil: Casada
  Profissão: Professora
  RG: 12.345.678-9 - ESTADO: SP
  CPF: 123.456.789-00
  ...
  ```
- Clique em **"Extrair dados"**
- Veja a **pré-visualização** formatada

### 3. Dados da Parte Ré

- Digite o **CNPJ** da instituição financeira
- Ative o toggle **"Usar busca online"**
- Clique em **"Buscar"** para preencher automaticamente
- Ou clique em **"Editar"** para preencher manualmente

### 4. Tabela de Contratos

- Clique em **"+ Adicionar linha"** para cada contrato
- Preencha:
  - Número do contrato
  - Data de início (MM/AA)
  - Data de fim (MM/AA)
  - Situação (ENCERRADO/ATIVO)
  - Valor da parcela (R$)
- O sistema calcula automaticamente:
  - **Total Pago**
  - **Total em Dobro** (para restituição)

### 5. Gerar Documento

- Clique em **"Gerar DOCX"** para baixar o documento Word
- Clique em **"Gerar PDF"** para baixar o PDF
- Clique em **"Gerar DOCX + PDF"** para baixar ambos

---

## 🔧 Configuração Avançada

### Adicionar Novos Estados/Cidades

Edite o arquivo `python_backend/static/estados_cidades.json`:

```json
{
  "SP": ["São Paulo", "Campinas", "Santos", ...],
  "RJ": ["Rio de Janeiro", "Niterói", "Petrópolis", ...],
  ...
}
```

### Personalizar Template DOCX

1. Abra `python_backend/templates/template_peticaoconsig.docx`
2. Edite o template usando **marcadores** como `{{NOME_COMPLETO}}`, `{{CPF}}`, etc.
3. Salve o arquivo
4. Reinicie o servidor

### Adicionar Novas APIs de CNPJ

Edite a função de busca em `python_backend/static/peticao_consignado.html`:

```javascript
const tries = [
  `/api/cnpj/brasilapi/${cnpj}`,
  `/api/cnpj/receitaws/${cnpj}`,
  `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  `https://www.receitaws.com.br/v1/cnpj/${cnpj}`,
  // Adicione novas APIs aqui
];
```

---

## 🐛 Solução de Problemas

### Erro: "LibreOffice not found"

**Solução:** Instale o LibreOffice conforme as instruções acima.

### Erro: "Port 8013 already in use"

**Solução:** Mate o processo que está usando a porta:
```bash
lsof -ti:8013 | xargs kill -9
```

### Erro: "Failed to fetch CNPJ"

**Solução:** Verifique sua conexão com a internet ou preencha manualmente.

### Documentos não são baixados

**Solução:** Verifique se a pasta `python_backend/out/` existe e tem permissões de escrita.

---

## 📄 Licença

Este projeto é de propriedade de **Juliano Garbuggio - Advocacia & Consultoria**.

**Powered by Jul.IA - Inteligência Jurídica Automatizada**

---

## 👨‍💻 Autor

**Juliano Garbuggio**  
Advogado & Desenvolvedor  
📧 juliano@garbuggio.com.br  
🌐 julianogarbuggio.adv.br

---

## 🔮 Roadmap

- [ ] **Fase 2:** Impugnações a Contestação (Digital, Física, Híbrida)
- [ ] **Fase 3:** Contestações (Digital, Física, Híbrida)
- [ ] **Fase 4:** Agravos de Instrumento, Embargos de Declaração, Recursos
- [ ] **Fase 5:** Biblioteca de módulos reutilizáveis (15+ cláusulas)
- [ ] **Fase 6:** Sistema de detecção automática de tipo de peça
- [ ] **Fase 7:** Expansão para outras áreas (Trabalhista, Previdenciário, Cível)

---

## 🙏 Agradecimentos

- **Manus.im** - Plataforma de desenvolvimento
- **BrasilAPI** - API de CNPJ gratuita
- **ReceitaWS** - API de CNPJ alternativa
- **FastAPI** - Framework web Python
- **LibreOffice** - Conversão de documentos

---

© 2025 Juliano Garbuggio - Advocacia & Consultoria | Powered by Jul.IA
