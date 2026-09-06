import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distReleaseDir = path.join(rootDir, 'dist-release');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const releaseName = `bus-aesh-v${version}-production`;
const stageDir = path.join(distReleaseDir, releaseName);

console.log(`📦 Packaging ${releaseName}...`);

// 1. Ensure fresh release staging directory
if (fs.existsSync(distReleaseDir)) {
  fs.rmSync(distReleaseDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// 2. Run builds
console.log('🔨 Building packages...');
execSync('npm run build --workspace=packages/shared', { stdio: 'inherit', cwd: rootDir });
execSync('npm run build --workspace=apps/api', { stdio: 'inherit', cwd: rootDir });
execSync('npm run build --workspace=apps/web', { stdio: 'inherit', cwd: rootDir });

// 3. Helper to copy directories while filtering out bloat/caches
function copyRecursive(src, dest, ignorePatterns = ['node_modules', '.next', '.git', '.turbo']) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (ignorePatterns.includes(base)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child), ignorePatterns);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('📂 Staging production files...');

// Shared package (source & dist)
copyRecursive(path.join(rootDir, 'packages/shared'), path.join(stageDir, 'packages/shared'));

// API app (source & dist)
copyRecursive(path.join(rootDir, 'apps/api'), path.join(stageDir, 'apps/api'));

// Web app (source, components, app, public - no .next cache!)
copyRecursive(path.join(rootDir, 'apps/web'), path.join(stageDir, 'apps/web'));

// Root configs & entrypoints
copyRecursive(path.join(rootDir, 'scripts'), path.join(stageDir, 'scripts'));
copyRecursive(path.join(rootDir, 'erp_bus_data.json'), path.join(stageDir, 'erp_bus_data.json'));
copyRecursive(path.join(rootDir, 'package.json'), path.join(stageDir, 'package.json'));
if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) {
  copyRecursive(path.join(rootDir, 'package-lock.json'), path.join(stageDir, 'package-lock.json'));
}
copyRecursive(path.join(rootDir, 'docker-compose.yml'), path.join(stageDir, 'docker-compose.yml'));
copyRecursive(path.join(rootDir, 'Dockerfile'), path.join(stageDir, 'Dockerfile'));
if (fs.existsSync(path.join(rootDir, 'DEPLOY.md'))) {
  copyRecursive(path.join(rootDir, 'DEPLOY.md'), path.join(stageDir, 'DEPLOY.md'));
}
copyRecursive(path.join(rootDir, 'start.sh'), path.join(stageDir, 'start.sh'));

// Ensure start.sh has Unix LF line endings
const startShPath = path.join(stageDir, 'start.sh');
if (fs.existsSync(startShPath)) {
  const content = fs.readFileSync(startShPath, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(startShPath, content);
}

// 4. Create ZIP archive with standard POSIX forward slashes
console.log('🗜️ Compressing release archive...');
const zipFile = path.join(distReleaseDir, `${releaseName}.zip`);

try {
  // Use bsdtar for cross-platform forward-slash ZIP archive
  execSync(`tar -a -c -f "${zipFile}" -C "${stageDir}" .`, { stdio: 'inherit' });
} catch {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${stageDir}" && zip -r "${zipFile}" .`, { stdio: 'inherit' });
  }
}

const stats = fs.statSync(zipFile);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n🎉 Success! Downloadable release created:`);
console.log(`📁 File: ${zipFile}`);
console.log(`📊 Size: ${sizeMb} MB\n`);
