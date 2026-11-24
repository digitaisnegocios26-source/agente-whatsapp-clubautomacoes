// Servidor: painel web + conexão com o WhatsApp
import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import * as whatsapp from './whatsapp.js';
import * as atendente from './atendente.js';
import { iaConfigurada, provedor } from './ia.js';
import { lerConfig, salvarConfig, configurado } from './config.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SENHA = process.env.PAINEL_SENHA || '';
const TOKEN = SENHA ? crypto.createHmac('sha256', SENHA).update('clubautomacoes-painel').digest('hex') : '';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

const cookie = (req, nome) => (req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === nome)?.[1];
const logado = (req) => {
  const t = cookie(req, 'sessao') || '';
  return TOKEN && t.length === TOKEN.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(TOKEN));
};

app.get('/estilo.css', (_req, res) => res.sendFile(path.join(PUBLIC, 'estilo.css')));
app.get('/saude', (_req, res) => res.json({ ok: true, whatsapp: whatsapp.status.estado }));

app.get('/login', (_req, res) => res.sendFile(path.join(PUBLIC, SENHA ? 'login.html' : 'sem-senha.html')));
app.post('/login', (req, res) => {
  const s = String(req.body.senha || '');
  if (SENHA && s.length === SENHA.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(SENHA))) {
    res.setHeader('Set-Cookie', `sessao=${TOKEN}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000${req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
    return res.redirect('/');
  }
  res.redirect('/login?erro=1');
});
app.post('/sair', (_req, res) => {
  res.setHeader('Set-Cookie', 'sessao=; Path=/; Max-Age=0');
  res.redirect('/login');
});

// Tudo abaixo exige login
app.use((req, res, next) => {
  if (logado(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ erro: 'Faça login no painel.' });
  res.redirect('/login');
});

app.get('/', (_req, res) => res.sendFile(path.join(PUBLIC, 'painel.html')));
app.get('/api/status', (_req, res) => res.json({ ...whatsapp.status, configurado: configurado(), iaConfigurada: iaConfigurada(), provedorIA: provedor() }));
app.get('/api/config', (_req, res) => res.json(lerConfig()));
app.post('/api/config', (req, res) => res.json(salvarConfig(req.body || {})));
app.post('/api/testar', async (req, res) => {
  try {
    const historico = (req.body.historico || []).filter((m) => m && m.content).slice(-20);
    res.json(await atendente.testar(historico));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});
app.post('/api/desconectar', async (_req, res) => { await whatsapp.desconectar(); res.json({ ok: true }); });

// Só em modo de teste: simula uma mensagem chegando do WhatsApp
if (process.env.WHATSAPP_FAKE === '1') {
  app.post('/api/simular', async (req, res) => { await atendente.receber(req.body); res.json({ ok: true }); });
  app.post('/api/simular-estado', async (req, res) => {
    const QRCode = (await import('qrcode')).default;
    Object.assign(whatsapp.status, req.body.estado === 'qr'
      ? { estado: 'qr', numero: null, qr: await QRCode.toDataURL('exemplo-de-qr-code-clubautomacoes', { margin: 1, width: 320 }) }
      : { estado: 'conectado', numero: '5521900000000', qr: null });
    res.json({ ok: true });
  });
}

whatsapp.onMensagem(atendente.receber);
whatsapp.iniciar();

if (!SENHA) console.warn('⚠️  Defina a variável PAINEL_SENHA para usar o painel.');
if (!iaConfigurada()) console.warn('⚠️  Defina ANTHROPIC_API_KEY (Claude) ou OPENAI_API_KEY (OpenAI).');
else console.log(`🧠 IA: ${process.env.IA_FAKE === '1' ? 'teste' : provedor()}`);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Agente rodando na porta ${PORT}. Abra o endereço do servidor para acessar o painel.`));
