import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PeticaoContext {
  CIDADE?: string;
  ESTADO?: string;
  TIPO_ORGAO?: string;
  NOME_COMPLETO?: string;
  NACIONALIDADE?: string;
  DATA_NASCIMENTO?: string;
  ESTADO_CIVIL?: string;
  PROFISSAO?: string;
  RG?: string;
  RG_ESTADO?: string;
  CPF?: string;
  LOG?: string;
  N?: string;
  COMPL?: string;
  BAIRRO?: string;
  CEP?: string;
  CIDADE_AUTORA?: string;
  UF_AUTORA?: string;
  WHATS?: string;
  EMAIL?: string;
  BANCO_RAZAO_SOCIAL?: string;
  BANCO_LOGRADOURO?: string;
  BANCO_NUMERO?: string;
  BANCO_COMPLEMENTO?: string;
  BANCO_BAIRRO?: string;
  BANCO_CIDADE?: string;
  BANCO_UF?: string;
  BANCO_CEP?: string;
  HAS_ATIVO?: string;
  VALOR_PAGO_INDEVIDO?: string | number;
  VALOR_INDEVIDO_DOBRO?: string | number;
  VALOR_CAUSA?: string | number;
  VALOR_PAGO_INDEVIDO_FLOAT?: number;
  VALOR_INDEVIDO_DOBRO_FLOAT?: number;
  VALOR_CAUSA_FLOAT?: number;
  [key: string]: any;
}

export async function generateDocx(context: PeticaoContext): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  try {
    // Caminho do template
    const templatePath = path.join(__dirname, 'template_peticaoconsig.docx');
    
    // Verificar se o template existe
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }
    
    // Ler o template
    const content = fs.readFileSync(templatePath, 'binary');
    
    // Criar ZIP
    const zip = new PizZip(content);
    
    // Criar documento com delimitadores personalizados para Jinja2
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{%',
        end: '%}'
      }
    });
    
    // Preencher com os dados
    doc.render(context);
    
    // Gerar buffer
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    // Gerar nome do arquivo
    const filename = generateFilename(context, 'docx');
    
    return {
      buffer: buf,
      filename
    };
  } catch (error: any) {
    console.error('[DOCX Generator] Error:', error);
    if (error.properties && error.properties.errors) {
      console.error('[DOCX Generator] Template errors:', error.properties.errors);
    }
    throw new Error(`Falha ao gerar DOCX: ${error.message}`);
  }
}

export function generateFilename(context: PeticaoContext, extension: 'docx' | 'pdf'): string {
  // Extrair primeiro nome e último sobrenome
  const nomeCompleto = context.NOME_COMPLETO || 'Autor';
  const partesNome = nomeCompleto.trim().split(/\s+/);
  const primeiroNome = partesNome[0] || 'Nome';
  const ultimoSobrenome = partesNome[partesNome.length - 1] || 'Sobrenome';
  
  // Extrair nome do banco (primeiras palavras até S.A. ou LTDA)
  const bancoRazao = context.BANCO_RAZAO_SOCIAL || 'Banco';
  const nomeBanco = bancoRazao
    .replace(/\s+(S\.?A\.?|LTDA\.?|S\/A).*$/i, '')
    .trim()
    .replace(/\s+/g, '_');
  
  // Formato: 01_Peticao_Inicial_Nome_Sobrenome_x_Banco.docx
  return `01_Peticao_Inicial_${primeiroNome}_${ultimoSobrenome}_x_${nomeBanco}.${extension}`;
}
