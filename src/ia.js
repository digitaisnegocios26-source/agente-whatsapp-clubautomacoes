// Conversa com o Claude
import Anthropic from '@anthropic-ai/sdk';

let cliente;

export async function responder(instrucoes, mensagens) {
  if (process.env.IA_FAKE === '1') {
    const ultima = mensagens.at(-1).content.toLowerCase();
    if (ultima.includes('agendar')) return 'Ótimo! Vou passar para a equipe confirmar 😊 [[HUMANO]] Teste - agendamento';
    return `Resposta de teste para: "${ultima}"`;
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada');
  cliente ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resposta = await cliente.messages.create({
    model: process.env.MODELO_IA || 'claude-haiku-5-5',
    max_tokens: 500,
    system: [{ type: 'text', text: instrucoes, cache_control: { type: 'ephemeral' } }],
    messages: mensagens.map(({ role, content }) => ({ role, content })),
  });
  return resposta.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}
