import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const version = read('package.json').version;
for (const file of ['apps/api/package.json', 'apps/web/package.json', 'apps/mobile/package.json', 'packages/shared/package.json']) {
  assert.equal(read(file).version, version, file);
}
assert.equal(read('apps/mobile/app.json').expo.version, version);
assert.ok(fs.readFileSync('apps/mobile/android/app/build.gradle', 'utf8').includes(`versionName "${version}"`));
for (const suffix of ['production', 'linux-vbox']) {
  const stage = path.join('dist-release', `bus-aesh-v${version}-${suffix}`);
  for (const file of ['apps/mobile/app.json', 'apps/api/src/services/email-outbox.service.ts', 'DEPLOY.md', 'CHANGELOG.md']) {
    assert.ok(fs.existsSync(path.join(stage, file)), `${stage}: missing ${file}`);
  }
  const files = fs.readdirSync(stage, { recursive: true });
  assert.ok(!files.some(file => file.split(path.sep).some(part => part.startsWith('.env')) || /\.(apk|aab|tsbuildinfo|log)$/.test(file)), `${stage}: private or generated files`);
}
console.log(`Release ${version}: versions, source completeness, and credential/build exclusions passed.`);
