import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, FileText, FileCheck, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Contrato {
  id: number;
  numero: string;
  inicioMM: string;
  inicioAA: string;
  fimMM: string;
  fimAA: string;
  situacao: string;
  parcela: string;
  pago: number;
  apagar: number;
  copia: string;
}

export default function Home() {
  // Endereçamento
  const [uf, setUf] = useState("SP");
  const [cidade, setCidade] = useState("SÃO PAULO");
  const [tipoOrgao, setTipoOrgao] = useState("DA VARA CÍVEL");

  // Dados da Autora
  const [txtAutora, setTxtAutora] = useState("");
  const [dadosAutora, setDadosAutora] = useState<any>({});

  // Dados da Ré
  const [cnpj, setCnpj] = useState("");
  const [dadosRe, setDadosRe] = useState<any>({});
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);

  // Contratos
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [contadorId, setContadorId] = useState(1);
  const [totalPago, setTotalPago] = useState(0);
  const [totalDobro, setTotalDobro] = useState(0);
  const [hasAtivo, setHasAtivo] = useState(false);

  // Mutations
  const generateDocx = trpc.peticao.generateDocx.useMutation();
  const generatePdf = trpc.peticao.generatePdf.useMutation();
  const generateBoth = trpc.peticao.generateBoth.useMutation();

  const utils = trpc.useUtils();

  const parseTxtAutora = () => {
    const lines = txtAutora.split("\n");
    const data: any = {};

    lines.forEach((line) => {
      const [key, ...value] = line.split(':');
      const val = value.join(':').trim();
      
      if (key.includes('Nome completo')) data.NOME_COMPLETO = val;
      if (key.includes('Nacionalidade')) data.NACIONALIDADE = val;
      if (key.includes('Data de nascimento')) data.DATA_NASCIMENTO = val;
      if (key.includes('Estado civil')) data.ESTADO_CIVIL = val;
      if (key.includes('Profissão')) data.PROFISSAO = val;
      if (key.includes('RG')) {
        const rgParts = val.split('-');
        data.RG = rgParts[0]?.trim();
        data.RG_ESTADO = rgParts[1]?.replace('ESTADO', '').trim();
      }
      if (key.includes('CPF')) data.CPF = val;
      if (key.includes('ENDEREÇO COMPLETO')) {
        const endParts = val.split(',');
        data.LOG = endParts[0]?.trim();
        data.N = endParts[1]?.replace('nº', '').trim();
        data.COMPL = endParts[2]?.replace('complemento', '').trim();
      }
      if (key.includes('Bairro')) data.BAIRRO = val;
      if (key.includes('CEP')) data.CEP = val;
      if (key.includes('CIDADE')) {
        const cidParts = val.split(',');
        data.CIDADE_AUTORA = cidParts[0]?.trim();
        data.UF_AUTORA = cidParts[1]?.replace('ESTADO', '').trim();
      }
      if (key.includes('WhatsApp')) data.WHATS = val;
      if (key.includes('E-mail')) data.EMAIL = val;
    });

    setDadosAutora(data);
    toast.success("Dados extraídos com sucesso!");
  };

  const [cnpjParaBuscar, setCnpjParaBuscar] = useState<string | null>(null);
  
  const { data: dadosCNPJ, isLoading: buscandoCNPJQuery, error: erroCNPJ } = trpc.cnpj.brasilapi.useQuery(
    { cnpj: cnpjParaBuscar || '' },
    { enabled: !!cnpjParaBuscar && cnpjParaBuscar.length === 14 }
  );
  
  useEffect(() => {
    if (dadosCNPJ && cnpjParaBuscar) {
      setDadosRe({
        NOME_EMPRESA: dadosCNPJ.razao_social || dadosCNPJ.nome_fantasia || '',
        LOG_RE: dadosCNPJ.logradouro || '',
        N_RE: dadosCNPJ.numero || '',
        COMPL_RE: dadosCNPJ.complemento || '',
        BAIRRO_RE: dadosCNPJ.bairro || '',
        CIDADE_RE: dadosCNPJ.municipio || '',
        UF_RE: dadosCNPJ.uf || '',
        CEP_RE: dadosCNPJ.cep || '',
      });
      toast.success("CNPJ encontrado!");
      setCnpjParaBuscar(null);
    }
  }, [dadosCNPJ, cnpjParaBuscar]);
  
  useEffect(() => {
    if (erroCNPJ && cnpjParaBuscar) {
      toast.error("Erro ao buscar CNPJ");
      setCnpjParaBuscar(null);
    }
  }, [erroCNPJ, cnpjParaBuscar]);

  const handleBuscarCNPJ = () => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }

    setCnpjParaBuscar(cnpjLimpo);
  };

  const addContrato = () => {
    const novoContrato: Contrato = {
      id: contadorId,
      numero: "",
      inicioMM: "",
      inicioAA: "",
      fimMM: "",
      fimAA: "",
      situacao: "QUITADO",
      parcela: "",
      pago: 0,
      apagar: 0,
      copia: "SIM",
    };
    setContratos([...contratos, novoContrato]);
    setContadorId(contadorId + 1);
  };

  const removeContrato = (id: number) => {
    setContratos(contratos.filter((c) => c.id !== id));
  };

  const updateContrato = (id: number, field: keyof Contrato, value: string) => {
    setContratos(contratos.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // Recalcular valores quando contratos mudam
  useEffect(() => {
    let totalP = 0;
    let hasAtivoFlag = false;

    const novosContratos = contratos.map((contrato) => {
      const { inicioMM, inicioAA, fimMM, fimAA, situacao, parcela } = contrato;

      // Parse da parcela
      const parcelaString = parcela.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
      const parcelaFloat = parseFloat(parcelaString);

      if (!isNaN(parcelaFloat) && inicioMM && inicioAA && fimMM && fimAA) {
        const inicio = new Date(parseInt(`20${inicioAA}`), parseInt(inicioMM) - 1, 1);
        const fim = new Date(parseInt(`20${fimAA}`), parseInt(fimMM) - 1, 1);
        const hoje = new Date();

        // Meses totais do contrato
        const mesesContrato = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1;

        // Meses pagos (até hoje)
        const mesesAteHoje = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth()) + 1;
        const mesesPagos = Math.max(0, Math.min(mesesContrato, mesesAteHoje));

        // Meses restantes
        const mesesRestantes = Math.max(0, mesesContrato - mesesPagos);

        const pago = parcelaFloat * mesesPagos;
        const aPagar = (situacao === 'ATIVO' && mesesRestantes > 0) ? parcelaFloat * mesesRestantes : 0;

        totalP += pago;

        if (situacao === 'ATIVO') hasAtivoFlag = true;

        return { ...contrato, pago, apagar: aPagar };
      }

      return contrato;
    });

    setContratos(novosContratos);
    setTotalPago(totalP);
    setTotalDobro(totalP * 2);
    setHasAtivo(hasAtivoFlag);
  }, [contratos.map(c => `${c.inicioMM}-${c.inicioAA}-${c.fimMM}-${c.fimAA}-${c.situacao}-${c.parcela}`).join(',')]);

  const buildContext = () => {
    const context: any = {
      CIDADE: cidade,
      ESTADO: uf,
      TIPO_ORGAO: tipoOrgao,
      ...dadosAutora,
      ...dadosRe,
      HAS_ATIVO: hasAtivo ? 'SIM' : 'NÃO',
    };

    // Adicionar contratos
    contratos.forEach((ct, idx) => {
      const num = idx + 1;
      context[`CT${num}_NUMERO`] = ct.numero;
      context[`CT${num}_INICIO_MM`] = ct.inicioMM;
      context[`CT${num}_INICIO_AA`] = ct.inicioAA;
      context[`CT${num}_FIM_MM`] = ct.fimMM;
      context[`CT${num}_FIM_AA`] = ct.fimAA;
      context[`CT${num}_SITUACAO`] = ct.situacao;
      context[`CT${num}_PARCELA`] = ct.parcela;
      context[`CT${num}_PAGO`] = ct.pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      context[`CT${num}_APAGAR`] = ct.apagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      context[`CT${num}_PAGO_FLOAT`] = ct.pago;
      context[`CT${num}_APAGAR_FLOAT`] = ct.apagar;
      context[`CT${num}_COPIA`] = ct.copia;
    });

    // Totais
    context.VALOR_PAGO_INDEVIDO = totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    context.VALOR_INDEVIDO_DOBRO = totalDobro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    context.VALOR_CAUSA = (totalDobro + contratos.reduce((sum, c) => sum + c.apagar, 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    context.VALOR_PAGO_INDEVIDO_FLOAT = totalPago;
    context.VALOR_INDEVIDO_DOBRO_FLOAT = totalDobro;
    context.VALOR_CAUSA_FLOAT = totalDobro + contratos.reduce((sum, c) => sum + c.apagar, 0);

    return context;
  };

  const handleGenerate = async (format: "docx" | "pdf" | "both") => {
    try {
      const context = buildContext();

      if (format === "docx") {
        const result = await generateDocx.mutateAsync({ context });
        window.open(result.docxUrl, "_blank");
        toast.success("DOCX gerado com sucesso!");
      } else if (format === "pdf") {
        const result = await generatePdf.mutateAsync({ context });
        window.open(result.pdfUrl, "_blank");
        toast.success("PDF gerado com sucesso!");
      } else {
        const result = await generateBoth.mutateAsync({ context });
        window.open(result.docxUrl, "_blank");
        window.open(result.pdfUrl, "_blank");
        toast.success("DOCX e PDF gerados com sucesso!");
      }
    } catch (error: any) {
      toast.error(error?.message || "Erro ao gerar documento");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Jul.IA <span className="text-blue-400">| Plataforma Inteligente de Petições</span>
          </h1>
          <p className="text-blue-300 text-lg">Petição Inicial Empréstimo Consignado</p>
        </div>

        {/* Endereçamento */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">1) Endereçamento da peça</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="uf" className="text-slate-300">Estado (UF)</Label>
                <Input
                  id="uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="cidade" className="text-slate-300">Cidade</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value.toUpperCase())}
                  className="bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Tipo de Órgão</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  "DA VARA CÍVEL",
                  "DO JUIZADO ESPECIAL CÍVEL",
                  "DA VARA CÍVEL FEDERAL",
                  "DO JUIZADO ESPECIAL CÍVEL FEDERAL",
                ].map((orgao) => (
                  <Button
                    key={orgao}
                    variant={tipoOrgao === orgao ? "default" : "outline"}
                    onClick={() => setTipoOrgao(orgao)}
                    className="text-xs"
                  >
                    {orgao}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados da Autora */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">2) Dados da Parte Autora</CardTitle>
            <CardDescription className="text-slate-400">
              Cole o TXT do formulário e clique em "Extrair dados"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={txtAutora}
              onChange={(e) => setTxtAutora(e.target.value)}
              placeholder="Nome completo: &#10;Nacionalidade: &#10;..."
              className="min-h-[200px] font-mono text-sm bg-slate-900 border-slate-600 text-white"
            />
            <Button onClick={parseTxtAutora} className="w-full md:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              Extrair dados
            </Button>
            {dadosAutora.NOME_COMPLETO && (
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-600">
                <p className="text-sm text-slate-300 font-mono">
                  {dadosAutora.NOME_COMPLETO}, {dadosAutora.NACIONALIDADE}, {dadosAutora.ESTADO_CIVIL}, {dadosAutora.PROFISSAO}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados da Ré */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">3) Dados da Parte Ré</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="bg-slate-900 border-slate-600 text-white"
              />
              <Button onClick={handleBuscarCNPJ} disabled={buscandoCNPJQuery}>
                {buscandoCNPJQuery ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>
            {dadosRe.NOME_EMPRESA && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
                <div>
                  <Label className="text-slate-400 text-xs">Razão Social</Label>
                  <p className="text-white">{dadosRe.NOME_EMPRESA}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Logradouro</Label>
                  <p className="text-white">{dadosRe.LOG_RE}, {dadosRe.N_RE}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Bairro</Label>
                  <p className="text-white">{dadosRe.BAIRRO_RE}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Cidade/UF</Label>
                  <p className="text-white">{dadosRe.CIDADE_RE} - {dadosRe.UF_RE}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">CEP</Label>
                  <p className="text-white">{dadosRe.CEP_RE}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos */}
        <Card className="mb-6 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">4) Tabela dos Contratos Revisados</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={addContrato} className="mb-4">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar linha
            </Button>
            {contratos.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Nº Contrato</TableHead>
                      <TableHead className="text-slate-300">Início (MM/AA)</TableHead>
                      <TableHead className="text-slate-300">Fim (MM/AA)</TableHead>
                      <TableHead className="text-slate-300">Situação</TableHead>
                      <TableHead className="text-slate-300">Parcela R$</TableHead>
                      <TableHead className="text-slate-300">Pago</TableHead>
                      <TableHead className="text-slate-300">A Pagar</TableHead>
                      <TableHead className="text-slate-300">Cópia</TableHead>
                      <TableHead className="text-slate-300"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((contrato) => (
                      <TableRow key={contrato.id} className="border-slate-700">
                        <TableCell>
                          <Input
                            value={contrato.numero}
                            onChange={(e) => updateContrato(contrato.id, "numero", e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white text-xs w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Input
                              value={contrato.inicioMM}
                              onChange={(e) => updateContrato(contrato.id, "inicioMM", e.target.value)}
                              className="bg-slate-900 border-slate-600 text-white text-xs w-12"
                              placeholder="MM"
                              maxLength={2}
                            />
                            <Input
                              value={contrato.inicioAA}
                              onChange={(e) => updateContrato(contrato.id, "inicioAA", e.target.value)}
                              className="bg-slate-900 border-slate-600 text-white text-xs w-12"
                              placeholder="AA"
                              maxLength={2}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Input
                              value={contrato.fimMM}
                              onChange={(e) => updateContrato(contrato.id, "fimMM", e.target.value)}
                              className="bg-slate-900 border-slate-600 text-white text-xs w-12"
                              placeholder="MM"
                              maxLength={2}
                            />
                            <Input
                              value={contrato.fimAA}
                              onChange={(e) => updateContrato(contrato.id, "fimAA", e.target.value)}
                              className="bg-slate-900 border-slate-600 text-white text-xs w-12"
                              placeholder="AA"
                              maxLength={2}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={contrato.situacao}
                            onValueChange={(value) => updateContrato(contrato.id, "situacao", value)}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUITADO">QUITADO</SelectItem>
                              <SelectItem value="ATIVO">ATIVO</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={contrato.parcela}
                            onChange={(e) => updateContrato(contrato.id, "parcela", e.target.value)}
                            className="bg-slate-900 border-slate-600 text-white text-xs w-24"
                            placeholder="0,00"
                          />
                        </TableCell>
                        <TableCell className="text-green-400 text-xs">
                          {contrato.pago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-yellow-400 text-xs">
                          {contrato.apagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={contrato.copia}
                            onValueChange={(value) => updateContrato(contrato.id, "copia", value)}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-600 text-white text-xs w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SIM">SIM</SelectItem>
                              <SelectItem value="NÃO">NÃO</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContrato(contrato.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-bold">TOTAL PAGO:</span>
                    <span className="text-green-400 font-bold">
                      {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-bold">TOTAL EM DOBRO:</span>
                    <span className="text-blue-400 font-bold">
                      {totalDobro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="text-sm text-slate-400 mt-4">
              {contratos.length} contrato(s) adicionado(s)
            </div>
          </CardContent>
        </Card>

        {/* Gerar Documento */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">6) Gerar Documento</CardTitle>
            <CardDescription className="text-slate-400">
              Selecione o formato desejado para gerar a petição preenchida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => handleGenerate("docx")}
                disabled={generateDocx.isPending}
                className="flex-1"
              >
                {generateDocx.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Gerar DOCX
              </Button>
              <Button
                onClick={() => handleGenerate("pdf")}
                disabled={generatePdf.isPending}
                className="flex-1"
              >
                {generatePdf.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileCheck className="mr-2 h-4 w-4" />
                )}
                Gerar PDF
              </Button>
              <Button
                onClick={() => handleGenerate("both")}
                disabled={generateBoth.isPending}
                className="flex-1"
              >
                {generateBoth.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Gerar DOCX + PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-400 text-sm">
          © 2025 Juliano Garbuggio - Advocacia & Consultoria | Powered by Jul.IA - Inteligência Jurídica Automatizada
        </div>
      </div>
    </div>
  );
}
