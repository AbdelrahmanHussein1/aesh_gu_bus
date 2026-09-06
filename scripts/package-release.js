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

// 3. Helper to copy directories
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('📂 Staging production files...');

// Shared package
copyRecursive(path.join(rootDir, 'packages/shared/dist'), path.join(stageDir, 'packages/shared/dist'));
copyRecursive(path.join(rootDir, 'packages/shared/package.json'), path.join(stageDir, 'packages/shared/package.json'));

// API app
copyRecursive(path.join(rootDir, 'apps/api/dist'), path.join(stageDir, 'apps/api/dist'));
copyRecursive(path.join(rootDir, 'apps/api/drizzle'), path.join(stageDir, 'apps/api/drizzle'));
copyRecursive(path.join(rootDir, 'apps/api/package.json'), path.join(stageDir, 'apps/api/package.json'));
if (fs.existsSync(path.join(rootDir, 'apps/api/.env.example'))) {
  copyRecursive(path.join(rootDir, 'apps/api/.env.example'), path.join(stageDir, 'apps/api/.env.example'));
}

// Web app
copyRecursive(path.join(rootDir, 'apps/web/.next'), path.join(stageDir, 'apps/web/.next'));
if (fs.existsSync(path.join(rootDir, 'apps/web/public'))) {
  copyRecursive(path.join(rootDir, 'apps/web/public'), path.join(stageDir, 'apps/web/public'));
}
copyRecursive(path.join(rootDir, 'apps/web/package.json'), path.join(stageDir, 'apps/web/package.json'));

// Root config & docs
copyRecursive(path.join(rootDir, 'package.json'), path.join(stageDir, 'package.json'));
if (fs.existsSync(path.join(rootDir, 'docker-compose.yml'))) {
  copyRecursive(path.join(rootDir, 'docker-compose.yml'), path.join(stageDir, 'docker-compose.yml'));
}
if (fs.existsSync(path.join(rootDir, 'Dockerfile'))) {
  copyRecursive(path.join(rootDir, 'Dockerfile'), path.join(stageDir, 'Dockerfile'));
}
if (fs.existsSync(path.join(rootDir, 'DEPLOY.md'))) {
  copyRecursive(path.join(rootDir, 'DEPLOY.md'), path.join(stageDir, 'DEPLOY.md'));
}
if (fs.existsSync(path.join(rootDir, 'start.sh'))) {
  copyRecursive(path.join(rootDir, 'start.sh'), path.join(stageDir, 'start.sh'));
}

// 4. Create ZIP archive
console.log('🗜️ Compressing release archive...');
const zipFile = path.join(distReleaseDir, `${releaseName}.zip`);

if (process.platform === 'win32') {
  execSync(`powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
} else {
  execSync(`cd "${distReleaseDir}" && zip -r "${releaseName}.zip" "${releaseName}"`, { stdio: 'inherit' });
}

const stats = fs.statSync(zipFile);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n🎉 Success! Downloadable release created:`);
console.log(`📁 File: ${zipFile}`);
console.log(`📊 Size: ${sizeMb} MB\n`);
