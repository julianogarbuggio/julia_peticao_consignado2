#!/usr/bin/env python3
"""
Script Python para gerar DOCX usando docxtpl (compatível com template Jinja2)
"""
import sys
import json
from pathlib import Path
from docxtpl import DocxTemplate
import re

def format_money(value):
    """Formata valor monetário para pt-BR"""
    if isinstance(value, str):
        return value
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def generate_filename(context, extension="docx"):
    """Gera nome de arquivo personalizado"""
    nome_completo = context.get("NOME_COMPLETO", "SEM_NOME")
    nome_empresa = context.get("NOME_EMPRESA", "SEM_EMPRESA")
    
    # Extrair primeiro nome e último sobrenome
    partes_nome = nome_completo.strip().split()
    if len(partes_nome) >= 2:
        primeiro_nome = partes_nome[0]
        ultimo_sobrenome = partes_nome[-1]
        nome_formatado = f"{primeiro_nome}_{ultimo_sobrenome}".upper()
    else:
        nome_formatado = nome_completo.replace(" ", "_").upper()
    
    # Limpar nome da empresa
    nome_empresa_limpo = re.sub(r'[^\w\s-]', '', nome_empresa)
    nome_empresa_limpo = nome_empresa_limpo.replace(" ", "_").upper()
    
    filename = f"01_Peticao_Inicial_{nome_formatado}_x_{nome_empresa_limpo}.{extension}"
    return filename

def render_docx(context_json, template_path, output_path):
    """Renderiza template DOCX com contexto"""
    try:
        # Parse context
        context = json.loads(context_json)
        
        # Garantir que todos os valores sejam strings
        for key, value in list(context.items()):
            if not isinstance(value, str):
                context[key] = str(value)
        
        # Aplicar maiúsculas
        if context.get("CIDADE"):
            context["CIDADE"] = context["CIDADE"].upper()
        if context.get("ESTADO"):
            context["ESTADO"] = context["ESTADO"].upper()
        if context.get("TIPO_ORGAO"):
            context["TIPO_ORGAO"] = context["TIPO_ORGAO"].upper()
        if context.get("NOME_COMPLETO"):
            context["NOME_COMPLETO"] = context["NOME_COMPLETO"].upper()
        if context.get("NOME_EMPRESA"):
            context["NOME_EMPRESA"] = context["NOME_EMPRESA"].upper()
        
        # Formatar valores monetários
        campos_monetarios = ["VALOR_PAGO_INDEVIDO", "VALOR_INDEVIDO_DOBRO", "VALOR_CAUSA"]
        for campo in campos_monetarios:
            if campo in context:
                try:
                    valor = float(str(context[campo]).replace("R$", "").replace(".", "").replace(",", ".").strip())
                    context[campo] = format_money(valor)
                except:
                    pass
        
        # Formatar valores da tabela
        for key, value in list(context.items()):
            if key.endswith("_FLOAT"):
                try:
                    valor = float(value)
                    context[key.replace("_FLOAT", "")] = format_money(valor)
                    del context[key]
                except:
                    pass
        
        # Renderizar template
        tpl = DocxTemplate(template_path)
        tpl.render(context)
        
        # Gerar nome de arquivo
        filename = generate_filename(context, "docx")
        final_output = Path(output_path) / filename
        
        # Salvar
        tpl.save(str(final_output))
        
        # Retornar caminho do arquivo gerado
        print(str(final_output))
        return 0
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: generate_docx.py <context_json> <template_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    
    context_json = sys.argv[1]
    template_path = sys.argv[2]
    output_path = sys.argv[3]
    
    sys.exit(render_docx(context_json, template_path, output_path))
