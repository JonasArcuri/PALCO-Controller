# PALCO — Controladora de samples

Aplicação estática com biblioteca local em IndexedDB e salvamento opcional no Supabase. Requer Node.js 22 ou superior para gerar a configuração pública e servir o projeto.

## Estrutura

- `midi-controller.html`: interface e formulários.
- `css/styles.css`: estilos.
- `js/app.js`: interface, controles e reprodução.
- `js/midi.js`: parser MIDI.
- `js/storage.js`: operações IndexedDB.
- `js/backup.js`: exportação e importação JSON.
- `js/cloud.js`: contas e salvamento/importação pelo Supabase.
- `.env`: configuração local, ignorada pelo Git.
- `.env.example`: modelo de configuração sem credenciais.
- `js/config.js`: configuração vazia para o modo local; o build gera a configuração em `dist/js/config.js`.
- `scripts/`: build e servidor local que publica somente os arquivos da aplicação.
- `supabase/schema.sql`: tabela, bucket privado e políticas RLS.

## Conectar ao Supabase

1. Crie um projeto Supabase e execute `supabase/schema.sql` no SQL Editor.
2. Em Authentication, habilite o provedor Email. Configure a Site URL com o endereço publicado e os endereços locais utilizados. Configure SMTP para envio de confirmações em produção.
3. Copie `.env.example` para `.env` se o arquivo ainda não existir. Preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com a URL e a **publishable key** (ou chave legada **anon**). O build rejeita chaves secretas e `service_role`.
4. Execute `npm start` e abra `http://localhost:3000`. Reinicie após alterar `.env`. Para produção, execute `npm run build` e publique somente `dist/`.
5. Clique em **Entrar / Criar conta**, informe e-mail e senha de pelo menos oito caracteres e escolha **Criar conta**. Se a confirmação estiver habilitada, confirme o e-mail e depois entre.
6. Use **Salvar na nuvem** para enviar a biblioteca. Em outro dispositivo, entre na mesma conta e use **Importar da nuvem**.

Sem configuração, o aplicativo continua funcionando localmente. O SDK Supabase é carregado de esm.sh apenas quando a configuração está preenchida. A nuvem depende de internet.

Na Vercel, cadastre `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` nas variáveis de ambiente do projeto e faça um novo deploy. O `vercel.json` já configura o build e a publicação de `dist/`. Variáveis do ambiente de build têm prioridade sobre `.env`.

O `.env` não é versionado nem copiado para `dist/`. A URL e a chave pública são incluídas no JavaScript gerado e continuam visíveis no navegador, como exige o SDK. Isso não substitui as políticas RLS: elas protegem o acesso aos dados. Nunca coloque segredos de backend nessas variáveis. O servidor local expõe apenas uma lista de arquivos públicos; não sirva a raiz do repositório.

## Salvamento

As edições são salvas automaticamente **neste navegador**. O envio ao Supabase é **manual**, pelo botão Salvar na nuvem, e substitui o último salvamento da conta após confirmação. Alterações feitas durante o envio precisam de outro salvamento. Não há sincronização automática nem mesclagem entre dispositivos: o último envio concluído prevalece.

Músicas, configurações dos samples e referências de arquivos ficam como JSONB em `palco_libraries`. Os binários ficam no bucket privado `palco-files`. Políticas RLS restringem o acesso ao proprietário autenticado.

Cada envio usa caminhos novos. A referência no banco só é atualizada após todos os uploads, preservando o salvamento anterior se um upload falhar. Arquivos de revisões antigas e uploads interrompidos permanecem no Storage; a limpeza deve ser feita pelo administrador sem remover caminhos referenciados pela biblioteca atual. Observe os limites de tamanho e quota do projeto.

**Importar da nuvem** adiciona cópias após confirmação, sem apagar a biblioteca local. Importações repetidas geram duplicatas. Entrar ou sair não apaga nem troca os dados locais: confira a biblioteca antes de enviá-la para outra conta em um navegador compartilhado.

## Uso e backups

Crie músicas e adicione arquivos de áudio ou MIDI. Letras ou números podem ser atalhos. Escape e troca de música interrompem a reprodução. Cada sample tem pausa, parada, repetição e volume.

Exportar backup gera JSON com arquivos em base64. Importar adiciona cópias. Preserve backups: limpar dados do site apaga a biblioteca local. MIDI usa sintetizador Web Audio básico, sem banco General MIDI nem comunicação com hardware; aceita formatos 0/1 PPQ. A compatibilidade de áudio depende do navegador.

## Verificação

Após conectar, verifique cadastro, confirmação por e-mail, login, envio e importação em outro navegador. Teste outra conta para verificar isolamento RLS. A validação remota ponta a ponta depende de um projeto configurado.

Referências: [autenticação](https://supabase.com/docs/guides/auth/passwords), [segurança de Storage](https://supabase.com/docs/guides/storage/security/access-control).
