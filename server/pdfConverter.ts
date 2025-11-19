import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PeticaoContext, generateDocx, generateFilename } from './docxGenerator.js';

const execAsync = promisify(exec);

export async function convertDocxToPdf(docxBuffer: Buffer, filename: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'));
  const docxPath = path.join(tempDir, filename);
  const pdfFilename = filename.replace(/\.docx$/i, '.pdf');
  const pdfPath = path.join(tempDir, pdfFilename);
  
  try {
    // Salvar DOCX temporário
    await fs.writeFile(docxPath, docxBuffer);
    
    // Converter usando LibreOffice
    await execAsync(
      `libreoffice --headless --convert-to pdf --outdir "${tempDir}" "${docxPath}"`,
      { timeout: 90000 }
    );
    
    // Ler PDF gerado
    const pdfBuffer = await fs.readFile(pdfPath);
    
    return pdfBuffer;
  } finally {
    // Limpar arquivos temporários
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Erro ao limpar temp:', error);
    }
  }
}

export async function generatePdf(context: PeticaoContext): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  // Gerar DOCX primeiro
  const { buffer: docxBuffer, filename: docxFilename } = await generateDocx(context);
  
  // Converter para PDF
  const pdfBuffer = await convertDocxToPdf(docxBuffer, docxFilename);
  
  // Nome do PDF
  const pdfFilename = generateFilename(context, 'pdf');
  
  return {
    buffer: pdfBuffer,
    filename: pdfFilename
  };
}

export async function generateBoth(context: PeticaoContext): Promise<{
  docx: { buffer: Buffer; filename: string };
  pdf: { buffer: Buffer; filename: string };
}> {
  // Gerar DOCX
  const docx = await generateDocx(context);
  
  // Converter para PDF
  const pdfBuffer = await convertDocxToPdf(docx.buffer, docx.filename);
  const pdfFilename = generateFilename(context, 'pdf');
  
  return {
    docx,
    pdf: {
      buffer: pdfBuffer,
      filename: pdfFilename
    }
  };
}
