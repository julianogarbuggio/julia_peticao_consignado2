# TODO - Jul.IA Petição Consignado

## FASE 1: Petição Inicial (ATUAL)

### CORREÇÃO URGENTE - Deploy com servidor Python
- [x] Copiar servidor Python original (porta 8012) para dentro do projeto
- [x] Configurar inicialização automática do Python no deploy
- [x] Testar geração de documentos
- [x] Fazer novo deploy funcional

### Tarefas anteriores
- [x] Reiniciar servidor
- [ ] Migrar geração DOCX/PDF para Node.js (independente do Python) - CANCELADO (usar Python)
- [ ] Testar todas as funcionalidades
- [ ] Fazer deploy permanente
- [ ] Corrigir pré-visualização (se necessário)

## FASE 2: Expansão Consignado (PRÓXIMA)

### 2.1 Impugnações a Contestação
- [ ] Impugnação Digital (assinatura eletrônica)
- [ ] Impugnação Física (papel)
- [ ] Impugnação Híbrida/Sem contrato

### 2.2 Contestações
- [ ] Contestação Digital
- [ ] Contestação Física
- [ ] Contestação Híbrida

### 2.3 Outras Peças
- [ ] Agravos de Instrumento
- [ ] Embargos de Declaração
- [ ] Recursos
- [ ] Petições Gerais

## FASE 3: Infraestrutura Modular (FUTURO)

- [ ] Biblioteca de módulos reutilizáveis (15+ cláusulas)
- [ ] Sistema de detecção automática de tipo de peça
- [ ] Interface para gerenciar templates
- [ ] Expansão para outras áreas (Trabalhista, Previdenciário, Cível)

## Concluído

- [x] HTML/CSS/JS funcional copiado
- [x] Proxy para servidor Python configurado
- [x] Interface básica funcionando

- [x] Refatorar HTML unificado seguindo lógica dos arquivos fornecidos pelo usuário
- [x] Implementar seção de endereçamento com seleção de estados e cidades sugeridas
- [x] Integrar lógica de parser de dados da autora do index.html fornecido
- [x] Integrar busca de CNPJ com toggle online/offline
- [x] Implementar tabela de contratos com cálculos automáticos
- [x] Atualizar template DOCX no repositório GitHub
- [x] Testar geração de DOCX e PDF com novo template

- [x] Corrigir proxy do Node.js para servir arquivos da pasta /out do Python
- [x] Testar download de DOCX e PDF após correção

- [x] Substituir HTML completo com arquivo index.html fornecido pelo usuário
- [x] Integrar lógica de busca de CNPJ com fallback de 4 APIs do dados_re.html
- [x] Testar geração de DOCX com todos os campos preenchidos
- [x] Testar geração de PDF com todos os campos preenchidos
- [x] Verificar se os downloads estão funcionando corretamente
