from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import uuid
import httpx
import json
from docxtpl import DocxTemplate
import subprocess
import os
from typing import Dict, Any, Optional
import re

app = FastAPI(title="Jul.IA - Petição Consignado")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = Path(__file__).parent
OUT = BASE / "out"
OUT.mkdir(exist_ok=True)
TPL = BASE / "templates" / "template_peticaoconsig.docx"
STATIC = BASE / "static"

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC)), name="static")
app.mount("/out", StaticFiles(directory=str(OUT)), name="out")


@app.get("/")
async def index():
    """Serve the main HTML page"""
    return FileResponse(str(STATIC / "peticao_consignado.html"))


class GenIn(BaseModel):
    # O template é fixo, mas o Pydantic exige que ele esteja aqui.
    # Tornando-o opcional para evitar o erro 422, já que o frontend não o envia.
    template: Optional[str] = None
    context: dict


def format_money(value: float) -> str:
    """Formata um float para string monetária brasileira (R$ X.XXX,XX)"""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def generate_filename(ctx: dict, extension: str) -> str:
    """
    Gera o nome do arquivo no formato:
    01_Peticao_Inicial_Nome_primeiro_sobrenome_autora_x_Nome_banco.{extension}
    
    Exemplo: 01_Peticao_Inicial_Juliano_Garbuggio_x_Banco_do_Brasil.docx
    """
    # Extrair nome completo da autora
    nome_completo = ctx.get("NOME_COMPLETO", "Autor_Desconhecido")
    
    # Dividir o nome em partes e pegar primeiro nome e último sobrenome
    partes_nome = nome_completo.strip().split()
    if len(partes_nome) >= 2:
        primeiro_nome = partes_nome[0]
        ultimo_sobrenome = partes_nome[-1]
        nome_formatado = f"{primeiro_nome}_{ultimo_sobrenome}"
    else:
        nome_formatado = partes_nome[0] if partes_nome else "Autor"
    
    # Extrair nome do banco/empresa
    nome_empresa = ctx.get("NOME_EMPRESA", "Empresa_Desconhecida")
    
    # Limpar o nome da empresa (remover caracteres especiais e espaços extras)
    nome_empresa_limpo = re.sub(r'[^\w\s-]', '', nome_empresa)
    nome_empresa_limpo = re.sub(r'\s+', '_', nome_empresa_limpo.strip())
    
    # Montar o nome do arquivo
    filename = f"01_Peticao_Inicial_{nome_formatado}_x_{nome_empresa_limpo}.{extension}"
    
    return filename

def _render_docx(ctx: dict) -> Path:
    """Render DOCX template with context"""
    
    # 1. Garantir que todos os valores sejam strings simples (exceto listas como CONTRATOS)
    from docxtpl import RichText
    for key, value in ctx.items():
        # Não converter listas (como CONTRATOS) nem RichText em string
        if key == "CONTRATOS" or isinstance(value, (list, RichText)):
            continue
        if not isinstance(value, str):
            ctx[key] = str(value)

    # 2. Adicionar data automática
    from datetime import datetime
    hoje = datetime.now()
    meses = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
    ctx["DIA"] = str(hoje.day)
    ctx["MES_EXTENSO"] = meses[hoje.month]
    ctx["ANO"] = str(hoje.year)

    # 3. Adicionar NOME_ACAO baseado em HAS_ATIVO
    has_ativo = ctx.get("HAS_ATIVO", "false").lower() == "true"
    
    # Converter HAS_ATIVO para booleano para o template
    ctx["MOSTRAR_TUTELA"] = has_ativo
    
    if has_ativo:
        ctx["NOME_ACAO"] = "AÇÃO DECLARATÓRIA DE NULIDADE CONTRATUAL C/C REPETIÇÃO DE INDÉBITO E DANOS MORAIS COM PEDIDO DE TUTELA ANTECIPADA"
    else:
        ctx["NOME_ACAO"] = "AÇÃO DECLARATÓRIA DE NULIDADE CONTRATUAL C/C REPETIÇÃO DE INDÉBITO E DANOS MORAIS"

    # 3. Aplicar maiúsculas nos campos de cabeçalho
    if ctx.get("CIDADE"): ctx["CIDADE"] = ctx["CIDADE"].upper()
    if ctx.get("ESTADO"): ctx["ESTADO"] = ctx["ESTADO"].upper()
    if ctx.get("TIPO_ORGAO"): ctx["TIPO_ORGAO"] = ctx["TIPO_ORGAO"].upper()
    if ctx.get("NOME_COMPLETO"): ctx["NOME_COMPLETO"] = ctx["NOME_COMPLETO"].upper()
    if ctx.get("NOME_EMPRESA"): ctx["NOME_EMPRESA"] = ctx["NOME_EMPRESA"].upper()

    # 2. Aplicar formatação monetária (Issue 4)
    campos_monetarios = ["VALOR_PAGO_INDEVIDO", "VALOR_INDEVIDO_DOBRO", "VALOR_CAUSA"]
    for campo in campos_monetarios:
        # Se o valor for float (vindo do JS como float), formatamos.
        if campo in ctx and isinstance(ctx[campo], (int, float)):
            ctx[campo] = format_money(ctx[campo])
        # Se o valor for string (vindo do JS como R$ X.XXX,XX), passamos como está.
        elif campo in ctx and isinstance(ctx[campo], str):
            pass # Já está formatado pelo JS

    # 3. Formatar valores da tabela (Issue 4)
    for key, value in list(ctx.items()): # Usamos list() para poder modificar o dicionário
        if key.endswith(("_FLOAT")) and isinstance(value, (int, float)):
            # Formata o valor monetário e o adiciona ao contexto sem o "_FLOAT"
            ctx[key.replace("_FLOAT", "")] = format_money(value)
            # Remove o campo float original para evitar poluição
            del ctx[key]
    
    # 4. Criar lista formatada de contratos (ao invés de tabela com loop)
    contratos_list = ctx.get("CONTRATOS", [])
    if contratos_list and isinstance(contratos_list, list) and len(contratos_list) > 0:
        contratos_linhas = []
        for contrato in contratos_list:
            linha = f"Contrato nº {contrato.get('numero', 'N/A')} | Início: {contrato.get('inicio', 'N/A')} | Fim: {contrato.get('fim', 'N/A')} | Situação: {contrato.get('situacao', 'N/A')} | Parcela: {contrato.get('parcela', 'N/A')} | Pago: {contrato.get('pago', 'N/A')} | A Pagar: {contrato.get('a_pagar', 'N/A')} | Cópia: {contrato.get('copia', 'N/A')}"
            contratos_linhas.append(linha)
        ctx["CONTRATOS_TEXTO"] = "\n\n".join(contratos_linhas)
    else:
        ctx["CONTRATOS_TEXTO"] = "Nenhum contrato informado."
            
    try:
        tpl = DocxTemplate(str(TPL))
        tpl.render(ctx)
        
        # Gerar nome de arquivo personalizado
        filename = generate_filename(ctx, "docx")
        out_path = OUT / filename
        
        tpl.save(str(out_path))
        return out_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar DOCX: {str(e)}")

def _convert_docx_to_pdf(docx_path: Path) -> Path:
    """Convert DOCX to PDF using LibreOffice"""
    pdf_path = docx_path.with_suffix(".pdf")
    
    try:
        # Usar LibreOffice para conversão real de DOCX para PDF
        subprocess.run([
            "libreoffice",
            "--headless",
            "--convert-to", "pdf",
            "--outdir", str(OUT),
            str(docx_path)
        ], check=True, capture_output=True, timeout=90)
        
        return pdf_path
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout na conversão para PDF")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao converter para PDF: {e.stderr.decode()}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro inesperado na conversão: {str(e)}")


@app.post("/api/generate/docx")
async def gen_docx(payload: GenIn):
    """Generate DOCX file"""
    p = _render_docx(payload.context)
    return JSONResponse({"docx_url": f"/out/{p.name}"})


@app.post("/api/generate/pdf")
async def gen_pdf(payload: GenIn):
    """Generate PDF file from DOCX"""
    docx_path = _render_docx(payload.context)
    pdf_path = _convert_docx_to_pdf(docx_path)
    
    if pdf_path.exists() and pdf_path.suffix == ".pdf":
        return JSONResponse({"pdf_url": f"/out/{pdf_path.name}"})
    else:
        raise HTTPException(status_code=500, detail="Falha na conversão para PDF")


@app.post("/api/generate/both")
async def gen_both(payload: GenIn):
    """Generate both DOCX and PDF files"""
    docx_path = _render_docx(payload.context)
    pdf_path = _convert_docx_to_pdf(docx_path)
    
    return JSONResponse({
        "docx_url": f"/out/{docx_path.name}",
        "pdf_url": f"/out/{pdf_path.name}" if pdf_path.exists() else None
    })


# CNPJ Lookup APIs
@app.get("/api/cnpj/brasilapi/{cnpj}")
async def cnpj_brasilapi(cnpj: str):
    """Lookup CNPJ via Brasil API"""
    try:
        url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}"
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url)
        return JSONResponse(r.json(), status_code=r.status_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar CNPJ: {str(e)}")


@app.get("/api/cnpj/receitaws/{cnpj}")
async def cnpj_receitaws(cnpj: str):
    """Lookup CNPJ via Receitaws"""
    try:
        url = f"https://www.receitaws.com.br/v1/cnpj/{cnpj}"
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url)
        return JSONResponse(r.json(), status_code=r.status_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar CNPJ: {str(e)}")


@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return JSONResponse({"status": "ok"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8013)
