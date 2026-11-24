# Como publicar o botão "Deploy on Railway" (feito uma vez, pela produtora)

## 1. Coloque o projeto no GitHub
1. Crie uma conta em github.com (se ainda não tiver).
2. Clique em **New repository**, dê o nome `agente-whatsapp-clubautomacoes` e escolha **Public**.
3. Na página do repositório vazio, clique em **uploading an existing file** e arraste todos os arquivos desta pasta (sem a pasta `node_modules`, se existir). Clique em **Commit changes**.

Por que público: quem compra o kit não tem acesso a um repositório privado seu. A contrapartida é que o código fica visível. O valor do kit está no painel pronto, nos manuais e no suporte.

## 2. Crie o template no Railway
1. Acesse railway.com/workspace/templates e clique em **New Template**.
2. Clique em **Add New** e escolha **GitHub Repo**. Selecione `agente-whatsapp-clubautomacoes`.
3. No serviço, abra **Variables** e crie:
   - `ANTHROPIC_API_KEY` vazia (o comprador preenche)
   - `PAINEL_SENHA` vazia (o comprador preenche)
   - `PASTA_DADOS` com o valor `/data`
4. Clique com o botão direito no serviço, escolha **Attach Volume** e use o caminho `/data`.
5. Em **Settings > Networking**, ative o domínio público (HTTP).
6. Clique em **Create Template**.

## 3. Pegue o link
Na página de templates, copie o link do template. É esse link que vai no botão e nos manuais.
Não publique no marketplace se não quiser que o template apareça para todo mundo.

## 4. Teste antes de vender
Abra o link, faça o deploy na sua conta e siga o Manual Visual até conectar um WhatsApp de teste.
