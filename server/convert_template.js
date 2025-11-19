import fs from 'fs';
import unzipper from 'unzipper';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import path from 'path';

const inputFile = './template_peticaoconsig.docx';
const outputFile = './template_peticaoconsig_nodejs.docx';
const tempDir = './temp_docx';

async function convertTemplate() {
  console.log('Extraindo DOCX...');
  
  // Extrair DOCX
  await fs.createReadStream(inputFile)
    .pipe(unzipper.Extract({ path: tempDir }))
    .promise();
  
  console.log('Convertendo sintaxe...');
  
  // Ler document.xml
  const documentPath = path.join(tempDir, 'word', 'document.xml');
  let content = fs.readFileSync(documentPath, 'utf8');
  
  // Converter {% para {{
  // Converter %} para }}
  // Converter {{ para {
  // Converter }} para }
  
  // Padrão Jinja2: {% if HAS_ATIVO %} ... {% endif %}
  // Padrão docxtemplater: {#HAS_ATIVO} ... {/HAS_ATIVO}
  
  // Converter condicionais
  content = content.replace(/{%\s*if\s+(\w+)\s*%}/g, '{#$1}');
  content = content.replace(/{%\s*endif\s*%}/g, '{/$1}');
  
  // Converter variáveis simples {% VARIAVEL %} para {VARIAVEL}
  content = content.replace(/{%\s*(\w+)\s*%}/g, '{$1}');
  
  // Salvar document.xml modificado
  fs.writeFileSync(documentPath, content, 'utf8');
  
  console.log('Recompactando DOCX...');
  
  // Recomprimir como DOCX
  const output = createWriteStream(outputFile);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  archive.directory(tempDir, false);
  await archive.finalize();
  
  console.log('Limpando arquivos temporários...');
  
  // Limpar temp
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  console.log('✅ Template convertido com sucesso!');
  console.log(`Arquivo salvo em: ${outputFile}`);
}

convertTemplate().catch(console.error);
