const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const local = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};
const url = process.env.SUPABASE_URL ?? local.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? local.SUPABASE_PUBLISHABLE_KEY ?? '';
if (Boolean(url) !== Boolean(key)) throw Error('Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY juntas.');
if (url && new URL(url).protocol !== 'https:') throw Error('SUPABASE_URL deve usar HTTPS.');
if (key && !key.startsWith('sb_publishable_')) {
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch {}
  if (role !== 'anon') throw Error('Use somente publishable key ou chave anon. Chaves secretas não podem ir para o navegador.');
}
const output = path.join(root, 'dist');
fs.mkdirSync(path.join(output, 'js'), { recursive: true });
fs.mkdirSync(path.join(output, 'css'), { recursive: true });
// Lista explícita: .env, SQL e arquivos internos nunca são publicados.
fs.copyFileSync(path.join(root, 'midi-controller.html'), path.join(output, 'midi-controller.html'));
fs.copyFileSync(path.join(root, 'css/styles.css'), path.join(output, 'css/styles.css'));
for (const name of ['app', 'backup', 'cloud', 'midi', 'storage']) {
  fs.copyFileSync(path.join(root, `js/${name}.js`), path.join(output, `js/${name}.js`));
}
fs.writeFileSync(path.join(output, 'js/config.js'), `// Gerado no build. Contém apenas configuração pública.\nwindow.PALCO_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseKey: key }, null, 2)};\n`);
console.log('Build concluído em dist/ (somente arquivos públicos).');
