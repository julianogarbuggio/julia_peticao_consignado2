import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupStaticRoutes(app: express.Application) {
  console.log('[Setup] Configuring static routes...');
  
  // Servir o HTML original funcional na raiz
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../python_backend/static/peticao_consignado.html'));
  });
  
  // Servir arquivos estáticos do servidor Python (ANTES do proxy /api)
  app.use('/out', async (req, res, next) => {
    const axios = (await import('axios')).default;
    
    const targetUrl = `http://localhost:8013${req.url}`;
    console.log('[Out Proxy] Requesting:', targetUrl);
    
    try {
      const response = await axios({
        method: 'GET',
        url: targetUrl,
        responseType: 'arraybuffer',
      });
      
      Object.keys(response.headers).forEach(key => {
        res.setHeader(key, response.headers[key]);
      });
      
      res.status(response.status).send(response.data);
    } catch (error: any) {
      console.error('[Static Proxy Error]', error.message);
      res.status(404).send('File not found');
    }
  });
  
  // Proxy para o servidor Python (porta 8013)
  app.use('/api', async (req, res, next) => {
    const axios = (await import('axios')).default;
    
    try {
      const response = await axios({
        method: req.method,
        url: `http://localhost:8013/api${req.url}`,
        data: req.body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
        },
        responseType: req.url.includes('/out/') ? 'arraybuffer' : 'json',
      });
      
      // Copiar headers da resposta
      Object.keys(response.headers).forEach(key => {
        res.setHeader(key, response.headers[key]);
      });
      
      res.status(response.status).send(response.data);
    } catch (error: any) {
      console.error('[Proxy Error]', error.message);
      res.status(error.response?.status || 500).json({
        error: error.message
      });
    }
  });
  
  // Servir arquivos estáticos do diretório public
  app.use('/static', express.static(path.join(__dirname, '../../client/public')));
}
