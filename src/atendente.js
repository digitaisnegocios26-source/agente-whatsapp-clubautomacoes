// O "cérebro" do atendimento: junta mensagens, chama a IA, responde e passa para humano
import * as memoria from './memoria.js';
import * as ia from './ia.js';
import * as whatsapp from './whatsapp.js';
import { lerConfig } from './config.js';
import { montarPrompt, MARCADOR_HUMANO } from './prompt.js';

const ESPERA_MS = Number(process.env.ESPERA_SEGUNDOS || 8) * 1000;
const PAUSA_HORAS = Number(process.env.PAUSA_HORAS || 12);

const timers = new Map();
const enviadasPeloRobo = new Set(); // ids das mensagens que o robô mandou

export async function receber(msg) {
  const { jid, texto, deMim } = msg;
  if (enviadasPeloRobo.has(msg.id)) return; // eco do próprio robô

  // Mensagem enviada pelo celular da empresa = um humano assumiu
  if (deMim) {
    memoria.pausar(jid, PAUSA_HORAS);
    console.log(`👤 Humano assumiu ${msg.telefone || jid}. Robô pausado por ${PAUSA_HORAS}h.`);
    return;
  }

  const cfg = lerConfig();
  if (cfg.ativo === false) return;
  if (msg.telefone && msg.telefone === cfg.numero_avisos) return;
  if (memoria.estaPausado(jid)) return;

  if (!texto) {
    if (msg.midia) await enviarComoRobo(jid, cfg.mensagem_audio || 'Ainda não consigo ouvir áudios por aqui 🙈 Pode me mandar por escrito?');
    return;
  }

  memoria.adicionar(jid, 'user', texto);
  clearTimeout(timers.get(jid));
  timers.set(jid, setTimeout(() => {
    timers.delete(jid);
    responder(msg).catch((e) => console.error('Erro no atendimento:', e.message));
  }, ESPERA_MS));
}

async function responder(msg) {
  const { jid } = msg;
  if (memoria.estaPausado(jid)) return;
  const cfg = lerConfig();
  const { mensagens } = memoria.ler(jid);
  if (!mensagens.length || mensagens.at(-1).role !== 'user') return;

  let resposta;
  try {
    resposta = await ia.responder(montarPrompt(cfg), mensagens);
  } catch (e) {
    console.error('Erro na IA:', e.message);
    await enviarComoRobo(jid, cfg.mensagem_fora_do_ar);
    await avisarEquipe(cfg, `⚠️ A IA falhou ao responder ${msg.nome || ''} ${contato(msg)}. Responda manualmente.`);
    memoria.pausar(jid, PAUSA_HORAS);
    return;
  }

  const [paraCliente, resumo] = resposta.split(MARCADOR_HUMANO).map((s) => s && s.trim());
  if (paraCliente) {
    memoria.adicionar(jid, 'assistant', paraCliente);
    await enviarComoRobo(jid, paraCliente);
  }
  if (resumo !== undefined) {
    memoria.pausar(jid, PAUSA_HORAS);
    await avisarEquipe(cfg, `🔔 Lead para atender\n${resumo || msg.nome || '(sem resumo)'}\n${contato(msg)}`);
    console.log(`🔔 ${msg.telefone || jid} passado para a equipe.`);
  }
}

const contato = (msg) => (msg.telefone ? `WhatsApp: wa.me/${msg.telefone}` : `Contato: ${msg.nome || 'veja a conversa no celular'}`);

async function enviarComoRobo(jid, texto) {
  const id = await whatsapp.enviar(jid, texto);
  if (id) {
    enviadasPeloRobo.add(id);
    setTimeout(() => enviadasPeloRobo.delete(id), 120_000);
  }
}

async function avisarEquipe(cfg, texto) {
  if (!cfg.numero_avisos) return console.log('(sem número de avisos) ' + texto);
  try {
    await enviarComoRobo(`${cfg.numero_avisos}@s.whatsapp.net`, texto);
  } catch (e) {
    console.error('Não consegui avisar a equipe:', e.message);
  }
}

// Conversa de teste pelo painel (não usa WhatsApp nem memória)
export async function testar(historico) {
  const resposta = await ia.responder(montarPrompt(lerConfig()), historico);
  const [paraCliente, resumo] = resposta.split(MARCADOR_HUMANO).map((s) => s && s.trim());
  return { resposta: paraCliente || '', resumo: resumo ?? null };
}
