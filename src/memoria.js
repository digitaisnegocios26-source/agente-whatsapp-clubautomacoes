// Histórico e pausa de cada contato, em arquivos JSON no volume
import fs from 'node:fs';
import path from 'node:path';
import { PASTA } from './config.js';

const DIR = path.join(PASTA, 'conversas');
const LIMITE = 30;
fs.mkdirSync(DIR, { recursive: true });

const arquivo = (id) => path.join(DIR, `${String(id).replace(/[^\w.-]/g, '_')}.json`);

export function ler(id) {
  try {
    return JSON.parse(fs.readFileSync(arquivo(id), 'utf8'));
  } catch {
    return { mensagens: [], pausadoAte: 0 };
  }
}

function salvar(id, dados) {
  dados.mensagens = dados.mensagens.slice(-LIMITE);
  while (dados.mensagens.length && dados.mensagens[0].role !== 'user') dados.mensagens.shift();
  fs.writeFileSync(arquivo(id), JSON.stringify(dados, null, 2));
}

export function adicionar(id, role, texto) {
  const dados = ler(id);
  const ultima = dados.mensagens.at(-1);
  if (ultima && ultima.role === role) ultima.content += `\n${texto}`;
  else dados.mensagens.push({ role, content: texto });
  salvar(id, dados);
  return dados;
}

export function pausar(id, horas) {
  const dados = ler(id);
  dados.pausadoAte = Date.now() + horas * 3600_000;
  salvar(id, dados);
}

export const estaPausado = (id) => ler(id).pausadoAte > Date.now();
