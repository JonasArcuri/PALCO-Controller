// A biblioteca local continua independente da conta; envios são explícitos.
(() => {
    let client, user, busy = false;
    const hint = document.querySelector('#cloudHint');
    const save = document.querySelector('#cloudSave');
    const load = document.querySelector('#cloudLoad');
    const account = document.querySelector('#account');
    const dialog = document.querySelector('#accountDialog');
    const form = document.querySelector('#accountForm');
    const message = document.querySelector('#accountMessage');
    function renderAccount() {
        save.disabled = load.disabled = busy || !user || !db;
        account.disabled = busy || !client;
        account.textContent = user ? 'Sair da conta' : 'Entrar / Criar conta';
        document.querySelector('#cloudStatus').textContent = user ? 'NUVEM DISPONÍVEL' : 'LOCAL · SEM CONTA';
        hint.textContent = user ? `${user.email} · Use Salvar na nuvem após editar.` : 'Entre para salvar sua biblioteca na nuvem.';
    }
    const checked = result => { if (result.error) throw result.error; return result.data; };
    async function run(action) {
        if (busy) return;
        busy = true;
        renderAccount();
        try { await action(); }
        catch (error) { notify('Supabase: ' + error.message); }
        finally { busy = false; renderAccount(); }
    }
    account.onclick = () => {
        if (user) {
            run(async () => {
                checked(await client.auth.signOut());
                notify('Conta desconectada. A biblioteca local permanece neste navegador.');
            });
        } else { message.textContent = ''; dialog.showModal(); }
    };
    document.querySelector('#accountCancel').onclick = () => dialog.close();
    form.onsubmit = async event => {
        event.preventDefault();
        if (busy) return;
        const signup = event.submitter?.value === 'signup';
        busy = true;
        form.querySelectorAll('button').forEach(button => button.disabled = true);
        renderAccount();
        try {
            const credentials = { email: form.elements.email.value.trim(), password: form.elements.password.value };
            const data = checked(await (signup ? client.auth.signUp(credentials) : client.auth.signInWithPassword(credentials)));
            form.elements.password.value = '';
            if (signup && !data.session) message.textContent = 'Confira seu e-mail para confirmar a conta. Depois, entre aqui.';
            else { dialog.close(); notify('Conta conectada. Salve ou importe sua biblioteca pelos botões da nuvem.'); }
        } catch (error) { message.textContent = error.message; }
        finally { busy = false; form.querySelectorAll('button').forEach(button => button.disabled = false); renderAccount(); }
    };
    function snapshot() {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['songs', 'samples', 'files']);
            const result = {};
            for (const name of ['songs', 'samples', 'files']) {
                const request = transaction.objectStore(name).getAll();
                request.onsuccess = () => result[name] = request.result;
            }
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = transaction.onabort = () => reject(transaction.error || Error('Falha ao ler biblioteca.'));
        });
    }
    save.onclick = () => run(async () => {
        if (!confirm('Salvar a biblioteca local nesta conta? Isso substituirá o último salvamento na nuvem.')) return;
        const owner = user.id;
        const data = await snapshot();
        const revision = crypto.randomUUID();
        const files = [];
        hint.textContent = 'Enviando arquivos…';
        // Caminhos imutáveis: uma falha de upload não altera o salvamento anterior.
        for (const file of data.files) {
            const path = `${owner}/${revision}/${file.id}`;
            checked(await client.storage.from('palco-files').upload(path, file.blob, { contentType: file.mime || 'application/octet-stream' }));
            files.push({ id: file.id, name: file.name, mime: file.mime, size: file.size, path });
        }
        checked(await client.from('palco_libraries').upsert({ user_id: owner, data: { version: 1, songs: data.songs, samples: data.samples, files }, updated_at: new Date().toISOString() }));
        notify('Biblioteca salva no Supabase.');
    });
    load.onclick = () => run(async () => {
        const row = checked(await client.from('palco_libraries').select('data').eq('user_id', user.id).maybeSingle());
        if (!row) throw Error('Esta conta ainda não possui um salvamento.');
        const backup = row.data;
        if (backup.version !== 1 || !['songs', 'samples', 'files'].every(key => Array.isArray(backup[key]))) throw Error('Biblioteca inválida.');
        hint.textContent = 'Baixando arquivos…';
        const files = [];
        for (const file of backup.files) {
            if (typeof file.path !== 'string' || !file.path.startsWith(user.id + '/')) throw Error('Caminho de arquivo inválido.');
            const blob = checked(await client.storage.from('palco-files').download(file.path));
            files.push({ ...file, data: await base64(blob) });
        }
        // Reutiliza a validação e a transação de importação local, preservando a biblioteca existente.
        const file = new Blob([JSON.stringify({ ...backup, files })], { type: 'application/json' });
        await document.querySelector('#backup').onchange({ target: { files: [file], value: '' } });
    });
    async function init() {
        const config = window.PALCO_CONFIG;
        if (!config?.supabaseUrl || !config?.supabaseKey) return;
        try {
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.102.0');
            client = createClient(config.supabaseUrl, config.supabaseKey);
            client.auth.onAuthStateChange((_event, session) => { user = session?.user || null; renderAccount(); });
            user = checked(await client.auth.getSession()).session?.user || null;
            await localReady;
            renderAccount();
        } catch (error) { hint.textContent = 'Falha na conexão: ' + error.message; }
    }
    init();
})();
