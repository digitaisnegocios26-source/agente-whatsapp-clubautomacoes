// Conexão direta com o WhatsApp por QR Code (biblioteca Baileys)
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, isLidUser, isPnUser, jidNormalizedUser } from '@whiskeysockets/baileys';
import { PASTA } from './config.js';

const AUTH = path.join(PASTA, 'whatsapp-sessao');
const FAKE = process.env.WHATSAPP_FAKE === '1';

export const status = { estado: 'iniciando', qr: null, numero: null, erro: null };
let sock = null;
let aoReceber = () => {};
let reconectarTimer = null;

export function onMensagem(fn) { aoReceber = fn; }

// Formato único: { id, jid, telefone, nome, texto, midia, deMim }
function ler(msg) {
  const k = msg.key || {};
  const jid = k.remoteJid || '';
  if (!isPnUser(jid) && !isLidUser(jid)) return null; // grupos, status, canais
  const m = msg.message || {};
  const texto = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || '';
  const midia = !!(m.audioMessage || m.imageMessage || m.videoMessage || m.stickerMessage);
  const pn = isPnUser(jid) ? jid : (k.remoteJidAlt && isPnUser(k.remoteJidAlt) ? k.remoteJidAlt : null);
  return {
    id: k.id,
    jid,
    telefone: pn ? pn.split('@')[0] : null,
    nome: msg.pushName || '',
    texto,
    midia,
    deMim: !!k.fromMe,
  };
}

export async function iniciar() {
  if (FAKE) { status.estado = 'conectado'; status.numero = 'teste'; return; }
  clearTimeout(reconectarTimer);
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH);
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* usa a padrão */ }
    sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.ubuntu('ClubAutomacoes'),
      logger: pino({ level: 'silent' }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        status.estado = 'qr';
        status.qr = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      }
      if (connection === 'open') {
        status.estado = 'conectado';
        status.qr = null;
        status.erro = null;
        status.numero = jidNormalizedUser(sock.user?.id || '').split('@')[0];
        console.log(`✅ WhatsApp conectado: ${status.numero}`);
      }
      if (connection === 'close') {
        const codigo = lastDisconnect?.error?.output?.statusCode;
        status.qr = null;
        if (codigo === DisconnectReason.loggedOut) {
          console.log('📴 WhatsApp desconectado pelo celular. Gerando novo QR Code.');
          fs.rmSync(AUTH, { recursive: true, force: true });
          status.estado = 'desconectado';
          status.numero = null;
        } else {
          status.estado = 'reconectando';
          console.log(`🔄 Conexão caiu (${codigo ?? 'sem código'}). Reconectando...`);
        }
        reconectarTimer = setTimeout(iniciar, 3000);
      }
    });
    sock.ev.on('messages.upsert', ({ messages, type }) => {
      for (const msg of messages) {
        // Só mensagens novas (até 2 min). Recebidas chegam como "notify";
        // as enviadas pelo celular da empresa podem chegar como "append".
        const ts = Number(msg.messageTimestamp || 0) * 1000;
        if (ts && Date.now() - ts > 120_000) continue;
        if (type !== 'notify' && !msg.key?.fromMe) continue;
        const m = ler(msg);
        if (m) Promise.resolve(aoReceber(m)).catch((e) => console.error('Erro no atendimento:', e.message));
      }
    });
  } catch (e) {
    status.estado = 'erro';
    status.erro = e.message;
    console.error('Erro ao iniciar WhatsApp:', e.message);
    reconectarTimer = setTimeout(iniciar, 10000);
  }
}

// Envia texto e devolve o id da mensagem enviada
export async function enviar(jid, texto) {
  if (FAKE) { console.log(`[enviaria para ${jid}] ${texto}`); return `fake-${Date.now()}-${Math.random()}`; }
  if (!sock || status.estado !== 'conectado') throw new Error('WhatsApp não está conectado');
  const r = await sock.sendMessage(jid, { text: texto });
  return r?.key?.id;
}

export async function desconectar() {
  if (FAKE) return;
  try { await sock?.logout(); } catch { /* já desconectado */ }
  fs.rmSync(AUTH, { recursive: true, force: true });
  status.estado = 'desconectado';
  status.numero = null;
  setTimeout(iniciar, 1500);
}
