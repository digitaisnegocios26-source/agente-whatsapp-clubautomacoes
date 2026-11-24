// Informações do negócio, salvas no volume (editadas pelo painel)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PASTA = path.resolve(process.env.PASTA_DADOS || './dados');
fs.mkdirSync(PASTA, { recursive: true });

const ARQUIVO = path.join(PASTA, 'config.json');
const EXEMPLO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cliente-exemplo.json');

export function lerConfig() {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  } catch {
    return JSON.parse(fs.readFileSync(EXEMPLO, 'utf8'));
  }
}

export function salvarConfig(dados) {
  const atual = lerConfig();
  const novo = { ...atual, ...dados };
  let num = String(novo.numero_avisos || '').replace(/\D/g, '');
  if (num.length === 10 || num.length === 11) num = `55${num}`; // faltou o 55
  novo.numero_avisos = num;
  fs.writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2));
  return novo;
}

export function configurado() {
  return fs.existsSync(ARQUIVO);
}
