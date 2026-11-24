# Agente de IA no WhatsApp · ClubAutomações

Atendente virtual com IA (Claude) para WhatsApp, com painel web e conexão por QR Code.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/3_I4ij?referralCode=9clPAm&utm_medium=integration&utm_source=template&utm_campaign=generic)


## Variáveis
| Variável | Obrigatória | O que é |
|---|---|---|
| ANTHROPIC_API_KEY | sim | Chave da API do Claude |
| PAINEL_SENHA | sim | Senha do painel |
| PASTA_DADOS | sim (no Railway: `/data`) | Onde ficam sessão do WhatsApp, informações e conversas |
| MODELO_IA | não | Padrão `claude-haiku-5-5` |
| ESPERA_SEGUNDOS | não | Espera antes de responder (padrão 8) |
| PAUSA_HORAS | não | Pausa do robô depois que um humano assume (padrão 12) |

O volume precisa estar montado em `/data`. Sem ele, a sessão do WhatsApp e as conversas se perdem a cada deploy.

## Uso
1. Abra o endereço do serviço e entre com a `PAINEL_SENHA`.
2. Preencha as informações do negócio e salve.
3. Teste a atendente no próprio painel.
4. Escaneie o QR Code com o WhatsApp do negócio (Aparelhos conectados).

## Teste local sem WhatsApp e sem gastar IA
`WHATSAPP_FAKE=1 IA_FAKE=1 PAINEL_SENHA=teste PASTA_DADOS=./dados npm start`

A conexão usa a biblioteca Baileys (não oficial). Use número comercial e nunca faça disparos em massa.

ClubAutomações · Thryve Digital Studio · digitaisnegocios26@gmail.com
