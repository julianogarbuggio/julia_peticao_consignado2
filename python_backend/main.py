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
    
    # 1. Garantir que todos os valores sejam strings simples para evitar erros de tipo de dado no DocxTemplate
    for key, value in ctx.items():
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
    
    if has_ativo:
        ctx["NOME_ACAO"] = "AÇÃO DECLARATÓRIA DE NULIDADE CONTRATUAL C/C REPETIÇÃO DE INDÉBITO E DANOS MORAIS COM PEDIDO DE TUTELA ANTECIPADA"
        ctx["TUTELA_LIMINARMENTE"] = ""  # Vazio porque o item 0 já está no template
        
        # Preencher TOPICO_V_TUTELA com conteúdo completo (usando RichText para negritos)
        from docxtpl import RichText
        rt = RichText()
        rt.add("V – DA TUTELA DE URGÊNCIA", bold=True)
        rt.add("\n\n")
        rt.add("A ")
        rt.add("tutela de urgência", bold=True)
        rt.add(" será concedida quando houver elementos que evidenciem a ")
        rt.add("probabilidade do direito", bold=True)
        rt.add(" e o ")
        rt.add("perigo de dano", bold=True)
        rt.add(" ou o ")
        rt.add("risco ao resultado útil do processo", bold=True)
        rt.add(", conforme previsto no ")
        rt.add("art. 300 do CPC", bold=True)
        rt.add(".\n\n")
        rt.add("No presente caso, estão presentes ambos os requisitos:\n\n")
        rt.add("1. ")
        rt.add("Probabilidade do Direito (Fumus Boni Iuris)", bold=True)
        rt.add(":\n\n")
        rt.add("A parte Autora demonstra a ")
        rt.add("ausência de contratação válida", bold=True)
        rt.add(", pois:\n\n")
        rt.add("• ")
        rt.add("Não há contrato físico ou digital apresentado pelo banco", bold=True)
        rt.add(";\n")
        rt.add("• ")
        rt.add("Não há assinatura eletrônica válida com biometria facial", bold=True)
        rt.add(";\n")
        rt.add("• ")
        rt.add("Não há logs de autenticação digital (IP, geolocalização, data/hora)", bold=True)
        rt.add(";\n")
        rt.add("• ")
        rt.add("O banco foi notificado via PROCON e permaneceu omisso", bold=True)
        rt.add(".\n\n")
        rt.add("Conforme o ")
        rt.add("art. 6º, VIII, do CDC", bold=True)
        rt.add(", cabe ao banco o ")
        rt.add("ônus de provar a contratação", bold=True)
        rt.add(", o que não foi feito. A ")
        rt.add("inversão do ônus da prova", bold=True)
        rt.add(" é aplicável, pois a parte Autora é hipervulnerável.\n\n")
        rt.add("2. ")
        rt.add("Perigo de Dano (Periculum in Mora)", bold=True)
        rt.add(":\n\n")
        rt.add("Os descontos indevidos estão sendo realizados ")
        rt.add("mensalmente sobre a verba alimentar da parte Autora", bold=True)
        rt.add(", comprometendo sua ")
        rt.add("subsistência mínima", bold=True)
        rt.add(". A continuidade dos descontos causa:\n\n")
        rt.add("• ")
        rt.add("Dano irreparável à dignidade da pessoa humana", bold=True)
        rt.add(" (art. 1º, III, da CF);\n")
        rt.add("• ")
        rt.add("Violação ao mínimo existencial", bold=True)
        rt.add(", impedindo o custeio de necessidades básicas (alimentação, saúde, moradia);\n")
        rt.add("• ")
        rt.add("Agravamento do dano moral", bold=True)
        rt.add(", gerando angústia, insegurança financeira e frustração.\n\n")
        rt.add("Conforme a ")
        rt.add("Súmula 297 do STJ", bold=True)
        rt.add(", o ")
        rt.add("Código de Defesa do Consumidor é aplicável às instituições financeiras", bold=True)
        rt.add(". Além disso, o ")
        rt.add("art. 42 do CDC", bold=True)
        rt.add(" veda a cobrança indevida, e o ")
        rt.add("art. 300 do CPC", bold=True)
        rt.add(" autoriza a concessão de tutela de urgência quando presentes os requisitos acima.\n\n")
        rt.add("Portanto, a ")
        rt.add("suspensão imediata dos descontos", bold=True)
        rt.add(" é medida que se impõe, sob pena de ")
        rt.add("dano irreparável à parte Autora", bold=True)
        rt.add(", devendo ser fixada ")
        rt.add("multa diária de R$ 1.000,00 por descumprimento", bold=True)
        rt.add(".")
        
        ctx["TOPICO_V_TUTELA"] = rt
    else:
        ctx["NOME_ACAO"] = "AÇÃO DECLARATÓRIA DE NULIDADE CONTRATUAL C/C REPETIÇÃO DE INDÉBITO E DANOS MORAIS"
        ctx["TUTELA_LIMINARMENTE"] = ""  # Vazio quando não tem contrato ativo
        ctx["TOPICO_V_TUTELA"] = ""  # Vazio quando não tem contrato ativo

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
