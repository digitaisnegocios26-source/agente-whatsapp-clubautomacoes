// Conversa com a IA: Claude (Anthropic) ou OpenAI, conforme a chave configurada
import Anthropic from '@anthropic-ai/sdk';

let anthropic;

// Usa a OpenAI se houver OPENAI_API_KEY e nenhuma chave do Claude (ou se IA_PROVEDOR=openai)
export function provedor() {
  const escolhido = (process.env.IA_PROVEDOR || '').toLowerCase();
  if (escolhido === 'openai' || escolhido === 'anthropic') return escolhido;
  if (process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-')) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return process.env.ANTHROPIC_API_KEY ? 'anthropic' : null;
}

export const iaConfigurada = () => process.env.IA_FAKE === '1' || !!provedor();

export async function responder(instrucoes, mensagens) {
  if (process.env.IA_FAKE === '1') {
    const ultima = mensagens.at(-1).content.toLowerCase();
    if (ultima.includes('agendar')) return 'Ótimo! Vou passar para a equipe confirmar 😊 [[HUMANO]] Teste - agendamento';
    return `Resposta de teste para: "${ultima}"`;
  }
  const p = provedor();
  if (p === 'openai') return responderOpenAI(instrucoes, mensagens);
  if (p === 'anthropic') return responderClaude(instrucoes, mensagens);
  throw new Error('Nenhuma chave de IA configurada (ANTHROPIC_API_KEY ou OPENAI_API_KEY)');
}

async function responderClaude(instrucoes, mensagens) {
  anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resposta = await anthropic.messages.create({
    model: process.env.MODELO_IA || 'claude-haiku-5-5',
    max_tokens: 500,
    system: [{ type: 'text', text: instrucoes, cache_control: { type: 'ephemeral' } }],
    messages: mensagens.map(({ role, content }) => ({ role, content })),
  });
  return resposta.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

async function responderOpenAI(instrucoes, mensagens) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.MODELO_OPENAI || 'gpt-4.1-mini',
      max_completion_tokens: 500,
      messages: [{ role: 'system', content: instrucoes }, ...mensagens.map(({ role, content }) => ({ role, content }))],
    }),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${dados.error?.message || 'erro desconhecido'}`);
  return (dados.choices?.[0]?.message?.content || '').trim();
}
