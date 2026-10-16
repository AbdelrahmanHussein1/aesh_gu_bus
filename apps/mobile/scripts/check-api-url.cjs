// Run with: npm run check:api-url --workspace=apps/mobile
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Expo SDK 51 installs this URL implementation in its native runtime.
const { URL } = require('whatwg-url-without-unicode');

function loadSource(file, modules) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'URL', outputText)(id => {
    assert.ok(Object.hasOwn(modules, id), `Unexpected import: ${id}`);
    return modules[id];
  }, module, module.exports, URL);
  return module.exports;
}

const api = loadSource('src/api.ts', {
  'react-native': { NativeModules: { SourceCode: { scriptURL: 'http://localhost:8081/index.bundle' } }, Platform: { OS: 'android' } },
});

for (const [input, origin, socket] of [
  [' https://EXAMPLE.com:443/ ', 'https://example.com', 'wss://example.com'],
  ['http://10.0.2.2:3000/', 'http://10.0.2.2:3000', 'ws://10.0.2.2:3000'],
  ['http://localhost:3000', 'http://localhost:3000', 'ws://localhost:3000'],
  ['https://[::1]:3000/', 'https://[::1]:3000', 'wss://[::1]:3000'],
]) {
  assert.equal(api.normalizeApiUrl(input), origin);
  assert.equal(api.toWebSocketUrl(input), socket);
}
for (const input of ['', 'example.com', 'https:example.com', 'ftp://example.com', 'https://user:pass@example.com', 'https://example.com/api', 'https://example.com/api/..', 'https://example.com//', 'https://example.com/?', 'https://example.com/?a=1', 'https://example.com/#', 'https://example.com/#section', 'http://example.com:99999']) {
  assert.throws(() => api.normalizeApiUrl(input), Error, input);
}
assert.equal(api.toWebSocketUrl(''), '');

// An invalid environment value must leave the server editor usable at startup.
const previousUrl = process.env.EXPO_PUBLIC_API_URL;
try {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.com/api';
  const writes = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState: initial => [typeof initial === 'function' ? initial() : initial, value => writes.push(value)],
    useCallback: callback => callback,
    useMemo: callback => callback(),
    createElement: (type, props) => ({ type, props }),
  };
  const { AppProvider } = loadSource('src/app-context.tsx', { react, './api': api });
  const value = AppProvider({ children: null }).props.value;
  assert.equal(value.serverUrl, '');
  assert.match(value.serverUrlError, /EXPO_PUBLIC_API_URL.*origin/);
  value.setServerUrl('http://10.0.2.2:3000/');
  assert.deepEqual(writes.at(-1), { serverUrl: 'http://10.0.2.2:3000', serverUrlError: null });
  delete process.env.EXPO_PUBLIC_API_URL;
  assert.equal(api.getInitialApiUrl(), 'http://10.0.2.2:3000');
} finally {
  if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = previousUrl;
}
console.log('Mobile API origin, WebSocket, and recoverable configuration checks passed.');
