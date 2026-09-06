import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distReleaseDir = path.join(rootDir, 'dist-release');
const releaseName = 'bus-aesh-linux-vbox';
const stageDir = path.join(distReleaseDir, releaseName);

console.log(`📦 Packaging ${releaseName} for Linux Ubuntu VirtualBox...`);

// Clean previous staging directory
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// Copy helper excluding node_modules, .next, .git, etc.
function copyFiltered(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (['node_modules', '.next', '.git', '.turbo', 'dist-release', 'dist', 'build', '.expo'].includes(base)) {
      return;
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyFiltered(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Copy root files
const rootFiles = [
  'package.json',
  'package-lock.json',
  'docker-compose.yml',
  'Dockerfile',
  'start.sh',
  'README.md',
  'STABLE_DOMAIN_GUIDE.md',
  'erp_bus_data.json',
  'VBOX_UBUNTU_GUIDE.md',
  'DEPLOY.md',
  'DESIGN.md',
  '.gitignore',
  '.dockerignore',
];

for (const file of rootFiles) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(stageDir, file));
  }
}

// 2. Copy directories
const dirsToCopy = ['apps', 'packages', 'scripts', '.github', 'Images'];
for (const dir of dirsToCopy) {
  console.log(`📂 Copying ${dir}...`);
  copyFiltered(path.join(rootDir, dir), path.join(stageDir, dir));
}

// 3. Compress ZIP
console.log('🗜️ Compressing Linux VBox release archive...');
const zipFile = path.join(distReleaseDir, `${releaseName}.zip`);

if (process.platform === 'win32') {
  execSync(`powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
} else {
  execSync(`cd "${distReleaseDir}" && zip -r "${releaseName}.zip" "${releaseName}"`, { stdio: 'inherit' });
}

const stats = fs.statSync(zipFile);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n🎉 Success! Linux Ubuntu VBox zip package created:`);
console.log(`📁 Archive: ${zipFile}`);
console.log(`📊 Size: ${sizeMb} MB\n`);
