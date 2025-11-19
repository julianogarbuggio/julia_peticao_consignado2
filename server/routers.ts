import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { generateDocx, type PeticaoContext } from "./docxGenerator";
import { convertDocxToPdf, generatePdf } from "./pdfConverter";
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  peticao: router({
    generateDocx: publicProcedure
      .input(z.object({
        context: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const { buffer, filename } = await generateDocx(input.context as PeticaoContext);
        
        // Upload para S3
        const fileKey = `peticoes/${filename}-${Date.now()}.docx`;
        const { url } = await storagePut(fileKey, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        
        return {
          docxUrl: url,
          filename: `${filename}.docx`,
        };
      }),
    
    generatePdf: publicProcedure
      .input(z.object({
        context: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const { buffer: pdfBuffer, filename } = await generatePdf(input.context);
        
        // Upload para S3
        const fileKey = `peticoes/${filename}-${Date.now()}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
        
        return {
          pdfUrl: url,
          filename,
        };
      }),
    
    generateBoth: publicProcedure
      .input(z.object({
        context: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const { buffer: docxBuffer, filename } = await generateDocx(input.context as PeticaoContext);
        
        // Upload DOCX
        const docxKey = `peticoes/${filename}-${Date.now()}.docx`;
        const { url: docxUrl } = await storagePut(docxKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        
        // Gerar PDF
        const { buffer: pdfBuffer, filename: pdfFilename } = await generatePdf(input.context);
        const pdfKey = `peticoes/${pdfFilename}-${Date.now()}.pdf`;
        const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, 'application/pdf');
        
        return {
          docxUrl,
          pdfUrl,
          docxFilename: `${filename}.docx`,
          pdfFilename: `${filename}.pdf`,
        };
      }),
  }),
  
  cnpj: router({
    brasilapi: publicProcedure
      .input(z.object({ cnpj: z.string() }))
      .query(async ({ input }) => {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${input.cnpj}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar CNPJ');
        }
        return response.json();
      }),
    
    receitaws: publicProcedure
      .input(z.object({ cnpj: z.string() }))
      .query(async ({ input }) => {
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${input.cnpj}`);
        if (!response.ok) {
          throw new Error('Falha ao buscar CNPJ');
        }
        return response.json();
      }),
  }),
});

export type AppRouter = typeof appRouter;
