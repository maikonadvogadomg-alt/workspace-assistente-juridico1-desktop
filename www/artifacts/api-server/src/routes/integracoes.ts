/**
 * Integrações com sistemas jurídicos externos:
 * e-SAJ, PROJUDI, SEEU, Eproc, PJud, PDPJ, CNJ Unificado
 *
 * Cada sistema requer credenciais configuradas pelo usuário.
 * As credenciais são armazenadas via storage.setSetting() — nunca em env vars.
 */
import { Router } from "express";
import { storage } from "../storage.js";
import { getLocalConfig, setLocalConfig } from "../local-config.js";

const router = Router();

// ── Status de todas as integrações ───────────────────────────────────────────
router.get("/integracoes/status", async (_req, res) => {
  try {
    const [esajLogin, projudiLogin, seeuLogin, eprocLogin, pjudLogin] = await Promise.all([
      storage.getSetting("esaj_login"),
      storage.getSetting("projudi_login"),
      storage.getSetting("seeu_login"),
      storage.getSetting("eproc_login"),
      storage.getSetting("pjud_login"),
    ]);

    const integracoes = [
      {
        id: "esaj",
        nome: "e-SAJ (TJSP/TJBA/TJSC/TJCE)",
        descricao: "Sistema de automação da Justiça Estadual (TJ-SP, TJ-BA, TJ-SC, TJ-CE)",
        configurado: !!esajLogin,
        url: "https://esaj.tjsp.jus.br",
        manual: "https://esaj.tjsp.jus.br/esaj/portal.do",
        campos: [
          { key: "esaj_login", label: "CPF/Login", tipo: "text", mascara: "CPF" },
          { key: "esaj_password", label: "Senha", tipo: "password" },
          { key: "esaj_tribunal", label: "Tribunal (ex: tjsp, tjba)", tipo: "text" },
        ],
      },
      {
        id: "projudi",
        nome: "PROJUDI (TJ-GO, TJ-PR, TJ-AM e outros)",
        descricao: "Processo Judicial Digital — tribunais estaduais que usam o PROJUDI",
        configurado: !!projudiLogin,
        url: "https://projudi.tjgo.jus.br",
        manual: "https://projudi.tjgo.jus.br/helpOnLine",
        campos: [
          { key: "projudi_login", label: "CPF/Login OAB", tipo: "text" },
          { key: "projudi_password", label: "Senha", tipo: "password" },
          { key: "projudi_tribunal", label: "Tribunal (ex: tjgo, tjpr)", tipo: "text" },
        ],
      },
      {
        id: "seeu",
        nome: "SEEU (Execução Penal Unificada)",
        descricao: "Sistema Eletrônico de Execução Unificada — Departamento Penitenciário Nacional",
        configurado: !!seeuLogin,
        url: "https://seeu.mj.gov.br",
        manual: "https://seeu.mj.gov.br/ajuda",
        campos: [
          { key: "seeu_login", label: "CPF do Advogado", tipo: "text" },
          { key: "seeu_password", label: "Senha SEEU", tipo: "password" },
        ],
      },
      {
        id: "eproc",
        nome: "eProc (TRFs e Tribunais Federais)",
        descricao: "Sistema do TRF4, TRF5 e outros tribunais federais",
        configurado: !!eprocLogin,
        url: "https://eproc.trf4.jus.br",
        manual: "https://eproc.trf4.jus.br/eproc/help",
        campos: [
          { key: "eproc_login", label: "CPF/Login", tipo: "text" },
          { key: "eproc_password", label: "Senha", tipo: "password" },
          { key: "eproc_tribunal", label: "Tribunal (ex: trf4, trf5)", tipo: "text" },
        ],
      },
      {
        id: "pjud",
        nome: "PJud (STJ — Processo Judicial Eletrônico)",
        descricao: "Sistema do Superior Tribunal de Justiça",
        configurado: !!pjudLogin,
        url: "https://processo.stj.jus.br",
        manual: "https://processo.stj.jus.br/processo/pesquisa",
        campos: [
          { key: "pjud_login", label: "CPF/Número OAB", tipo: "text" },
          { key: "pjud_password", label: "Senha", tipo: "password" },
        ],
      },
    ];

    res.json({ integracoes });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao buscar status das integrações" });
  }
});

// ── Salvar credenciais de uma integração ──────────────────────────────────────
router.post("/integracoes/credenciais", async (req, res) => {
  try {
    const { sistema, campos } = req.body as {
      sistema: string;
      campos: Record<string, string>;
    };

    if (!sistema || !campos) {
      return res.status(400).json({ message: "sistema e campos são obrigatórios" });
    }

    const sistemasValidos = ["esaj", "projudi", "seeu", "eproc", "pjud"];
    if (!sistemasValidos.includes(sistema)) {
      return res.status(400).json({ message: `Sistema inválido: ${sistema}` });
    }

    for (const [key, value] of Object.entries(campos)) {
      if (typeof value === "string" && key.startsWith(sistema)) {
        await storage.setSetting(key, value);
      }
    }

    res.json({ ok: true, message: `Credenciais do ${sistema.toUpperCase()} salvas com sucesso` });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao salvar credenciais" });
  }
});

// ── Limpar credenciais de uma integração ──────────────────────────────────────
router.delete("/integracoes/credenciais/:sistema", async (req, res) => {
  try {
    const { sistema } = req.params;
    const prefixKeys: Record<string, string[]> = {
      esaj: ["esaj_login", "esaj_password", "esaj_tribunal", "esaj_token"],
      projudi: ["projudi_login", "projudi_password", "projudi_tribunal", "projudi_token"],
      seeu: ["seeu_login", "seeu_password", "seeu_token"],
      eproc: ["eproc_login", "eproc_password", "eproc_tribunal", "eproc_token"],
      pjud: ["pjud_login", "pjud_password", "pjud_token"],
    };

    const keys = prefixKeys[sistema];
    if (!keys) return res.status(400).json({ message: "Sistema inválido" });

    for (const key of keys) {
      await storage.setSetting(key, "");
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao limpar credenciais" });
  }
});

// ── e-SAJ: consulta de processo ───────────────────────────────────────────────
router.post("/integracoes/esaj/consulta", async (req, res) => {
  try {
    const { numeroProcesso, tribunal = "tjsp" } = req.body as { numeroProcesso: string; tribunal?: string };
    if (!numeroProcesso) return res.status(400).json({ message: "Número do processo obrigatório" });

    // Limpa número para formato sem pontuação
    const clean = numeroProcesso.replace(/[.\-\s]/g, "");

    // e-SAJ fornece consulta pública sem autenticação para andamentos
    const tribunalUrls: Record<string, string> = {
      tjsp: "https://esaj.tjsp.jus.br/cgi/show.do?processo.codigo=",
      tjba: "https://esaj.tjba.jus.br/cgi/show.do?processo.codigo=",
      tjsc: "https://esaj.tjsc.jus.br/cgi/show.do?processo.codigo=",
      tjce: "https://esaj.tjce.jus.br/cgi/show.do?processo.codigo=",
    };

    const baseUrl = tribunalUrls[tribunal.toLowerCase()] || tribunalUrls.tjsp;

    res.json({
      ok: true,
      url: `${baseUrl}${clean}`,
      numeroProcesso: clean,
      tribunal: tribunal.toUpperCase(),
      message: "Abra a URL para consultar o processo no e-SAJ",
      consultaPublica: `https://esaj.${tribunal.toLowerCase()}.jus.br/cpopg/search.do?numeroDigitoAnoUnificado=${clean.slice(0, 7)}-${clean.slice(7, 9)}.${clean.slice(9, 13)}&foroNumeroUnificado=${clean.slice(16)}&dadosConsulta.localPesquisa.cdLocal=-1&dadosConsulta.tipoNuProcesso=UNIFICADO`,
    });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao consultar e-SAJ" });
  }
});

// ── PROJUDI: link de consulta ─────────────────────────────────────────────────
router.post("/integracoes/projudi/consulta", async (req, res) => {
  try {
    const { numeroProcesso, tribunal = "tjgo" } = req.body as { numeroProcesso: string; tribunal?: string };
    if (!numeroProcesso) return res.status(400).json({ message: "Número do processo obrigatório" });

    const tribunalUrls: Record<string, string> = {
      tjgo: "https://projudi.tjgo.jus.br/BuscaProcesso",
      tjpr: "https://projudi.tjpr.jus.br/projudi",
      tjam: "https://projudi.tjam.jus.br/projudi",
    };

    const url = tribunalUrls[tribunal.toLowerCase()] || tribunalUrls.tjgo;
    res.json({
      ok: true,
      url,
      numeroProcesso,
      tribunal: tribunal.toUpperCase(),
      message: "Acesse o PROJUDI e pesquise o processo",
    });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao consultar PROJUDI" });
  }
});

// ── eProc: link de consulta ───────────────────────────────────────────────────
router.post("/integracoes/eproc/consulta", async (req, res) => {
  try {
    const { numeroProcesso, tribunal = "trf4" } = req.body as { numeroProcesso: string; tribunal?: string };
    if (!numeroProcesso) return res.status(400).json({ message: "Número do processo obrigatório" });

    const tribunalUrls: Record<string, string> = {
      trf4: "https://eproc.trf4.jus.br/eproc",
      trf5: "https://eproc.trf5.jus.br/eproc",
    };

    const url = tribunalUrls[tribunal.toLowerCase()] || tribunalUrls.trf4;
    res.json({
      ok: true,
      url: `${url}/externo_controlador.php?acao=processo_consultar&num_processo=${encodeURIComponent(numeroProcesso)}`,
      numeroProcesso,
      tribunal: tribunal.toUpperCase(),
    });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao consultar eProc" });
  }
});

// ── PJud STJ: consulta pública ────────────────────────────────────────────────
router.post("/integracoes/pjud/consulta", async (req, res) => {
  try {
    const { numeroProcesso } = req.body as { numeroProcesso: string };
    if (!numeroProcesso) return res.status(400).json({ message: "Número do processo obrigatório" });

    const clean = numeroProcesso.replace(/[.\-\s]/g, "");
    res.json({
      ok: true,
      url: `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo=${encodeURIComponent(numeroProcesso)}`,
      numeroProcesso: clean,
      tribunal: "STJ",
    });
  } catch (e: any) {
    res.status(500).json({ message: "Erro ao consultar PJud" });
  }
});

// ── Auto-detect chave por prefixo ─────────────────────────────────────────────
router.post("/settings/key-detect", async (req, res) => {
  try {
    const { key } = req.body as { key: string };
    if (!key || typeof key !== "string") {
      return res.status(400).json({ detected: false, message: "Chave inválida" });
    }

    const { detectKeyProvider } = await import("../local-config.js");
    const detected = detectKeyProvider(key.trim());

    if (!detected) {
      return res.json({
        detected: false,
        message: "Prefixo não reconhecido. Configure manualmente o campo correto.",
        sugestao: "Verifique se copiou a chave completa com seu prefixo (sk-, AIza..., gsk_, pplx-, etc.)",
      });
    }

    res.json({
      detected: true,
      field: detected.field,
      label: detected.label,
      baseUrl: detected.baseUrl || null,
      message: `Chave reconhecida como: ${detected.label}`,
    });
  } catch (e: any) {
    res.status(500).json({ detected: false, message: e.message });
  }
});

// ── Listar todos os sistemas judiciais disponíveis ────────────────────────────
router.get("/integracoes/sistemas", (_req, res) => {
  res.json({
    sistemas: [
      { id: "esaj",    nome: "e-SAJ",    tipo: "Estadual",  tribunais: ["TJSP","TJBA","TJSC","TJCE","TJAL","TJAC","TJAP","TJAM","TJPA","TJPI","TJRN","TJSE"], url: "https://esaj.tjsp.jus.br" },
      { id: "projudi", nome: "PROJUDI",  tipo: "Estadual",  tribunais: ["TJGO","TJPR","TJAM","TJAC","TJRR","TJRO","TJTO","TJAP","TJMA"], url: "https://projudi.tjgo.jus.br" },
      { id: "seeu",    nome: "SEEU",     tipo: "Federal",   tribunais: ["DEPEN","TJs (execução penal)"], url: "https://seeu.mj.gov.br" },
      { id: "eproc",   nome: "eProc",    tipo: "Federal",   tribunais: ["TRF4","TRF5","TRF3","JFPR","JFSC","JFRS"], url: "https://eproc.trf4.jus.br" },
      { id: "pjud",    nome: "PJud",     tipo: "Superior",  tribunais: ["STJ"], url: "https://processo.stj.jus.br" },
      { id: "pdpj",    nome: "PDPJ",     tipo: "Nacional",  tribunais: ["CNJ","PJe","Diversos"], url: "https://gateway.cloud.pje.jus.br" },
      { id: "datajud", nome: "DataJud",  tipo: "Nacional",  tribunais: ["Todos"], url: "https://datajud.cnj.jus.br" },
    ],
  });
});

export default router;
