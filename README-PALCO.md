# Palco — Controladora de samples

Abra `midi-controller.html` em um navegador moderno. A aplicação é independente, sem dependências externas e sem backend. Para manter uma origem estável de armazenamento, também pode ser servida por um servidor HTTP estático local. Use sempre o mesmo navegador, endereço e perfil para acessar sua biblioteca.

## Utilização

1. Crie uma música no repertório.
2. Adicione um sample, informe o nome e escolha um arquivo.
3. Opcionalmente associe uma letra ou número como atalho.
4. Use reprodução/pausa, parada, repetição e volume em cada cartão.
5. Use Escape ou “Parar tudo” para interromper os samples. Trocar de música também interrompe a reprodução.
6. Exporte backups regularmente. A importação adiciona cópias das músicas sem substituir a biblioteca existente.

## Armazenamento

IndexedDB guarda três coleções: músicas, samples e arquivos binários. Não há envio de arquivos a servidores. A capacidade depende da quota do navegador. Limpar os dados do site ou usar outro navegador/endereço não preserva o acesso à biblioteca. Backups JSON incluem os arquivos em base64, ficando maiores que os originais e exigindo memória proporcional ao tamanho da biblioteca.

## Reprodução

Áudio usa o decodificador do navegador; nem todo formato ou codec é compatível. MIDI aceita Standard MIDI Files formato 0/1 com resolução PPQ, múltiplas trilhas e mudanças de tempo. A reprodução usa osciladores básicos Web Audio, sem banco de instrumentos General MIDI. Program changes, sustain, pitch bend e demais controladores não são interpretados nesta versão. Não há comunicação com hardware MIDI. A reprodução simultânea é independente, sem sincronização musical entre samples.

## Organização

A primeira versão está concentrada em um HTML independente: estilos, interface, persistência, reprodução, parser MIDI e backup. Essa escolha permite abrir a aplicação sem instalar ferramentas. Uma migração posterior pode separar esses módulos em React/TypeScript conforme o planejamento inicial.

## Validação pendente

O terminal do ambiente de construção não iniciou (código Windows -1073741502). Não foi possível executar testes automatizados ou validar a reprodução no navegador neste ambiente. Antes de uso ao vivo, verificar: criação/edição/exclusão; recarga preservando arquivos; dois áudios simultâneos; MIDI com mudanças de tempo; pausa/retomada/repetição; Escape e troca de música; exportação/importação; arquivo incompatível e armazenamento sem espaço.
