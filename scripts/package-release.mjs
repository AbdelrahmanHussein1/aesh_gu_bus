import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const suffix = process.argv.includes('--vbox') ? 'linux-vbox' : 'production';
const name = `bus-aesh-v${version}-${suffix}`;
const output = path.join(root, 'dist-release');
const stage = path.join(output, name);
const archive = path.join(output, `${name}.zip`);
// Stage only version-controlled source; private environment files and local builds stay out.
const files = execFileSync('git', ['ls-files', '-z', '--cached'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
fs.mkdirSync(output, { recursive: true });
if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true });
fs.mkdirSync(stage);
let count = 0;
for (const file of files) {
  if (file.split('/').some(part => part.startsWith('.env')) || /\.(apk|aab|tsbuildinfo|zip|log)$/.test(file)) continue;
  const source = path.join(root, file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
  const target = path.join(stage, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  if (/\.(sh|gradlew)$/.test(file) || file.endsWith('/gradlew')) {
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n'));
    fs.chmodSync(target, 0o755);
  }
  count++;
}
if (fs.existsSync(archive)) fs.unlinkSync(archive);
if (process.platform === 'win32') {
  execFileSync('tar', ['-a', '-c', '-f', archive, '-C', stage, '.'], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', archive, '.'], { cwd: stage, stdio: 'inherit' });
}
console.log(`Packaged ${count} tracked source files: ${archive}`);
console.log('Build and run with Docker Compose; see DEPLOY.md. No credentials are included.');
