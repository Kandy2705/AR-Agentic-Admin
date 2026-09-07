// Offline browser-test harness ONLY. Production uses the native ESM files in dist/app.
// Repackages compiled modules so sandboxed browsers can test DOM behavior without any navigation or network.
import ts from 'typescript';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
const root = resolve('dist/app');
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(resolve(dir, item.name)) : [resolve(dir, item.name)]); }
const mark = 'data:image/svg+xml;base64,' + readFileSync('public/mark.svg').toString('base64');
const factories = walk(root).filter(file => file.endsWith('.js')).map(file => {
  const id = '/' + relative(root, file).replaceAll('\\', '/');
  const source = readFileSync(file, 'utf8').replaceAll('./mark.svg', mark);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  return `${JSON.stringify(id)}: ${id === '/main.js' ? 'async ' : ''}function(require,module,exports){\n${output}\n}`;
}).join(',\n');
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/browser-bundle.js', `(()=>{const factories={${factories}};const cache={};function resolve(from,name){const parts=(name.startsWith('/')?name:from.slice(0,from.lastIndexOf('/')+1)+name).split('/');const out=[];for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p)}return '/'+out.join('/')}function load(id){if(cache[id])return cache[id].exports;if(!factories[id])throw Error('Unknown module '+id);const module={exports:{}};cache[id]=module;const result=factories[id](name=>load(resolve(id,name)),module,module.exports);if(result?.then)window.__BOOT_READY__=result;return module.exports}load('/main.js')})();`);
console.log('Prepared offline browser-test bundle (not included in production).');
