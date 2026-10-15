import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readSource} from './helpers.mjs';

const modules=[
  ['js/01-storage-compatibility.js','01-storage-compatibility','RosterBotStorageCompatibility'],
  ['js/01-persistence-registry.js','01-persistence-registry','RosterBotPersistenceRegistry'],
  ['js/02-canonical-state.js','02-canonical-state','RosterBotCanonicalPersistence'],
  ['js/02-persistence-safety.js','02-persistence-safety','RosterBotPersistenceSafety'],
  ['js/02-schema5.js','02-schema5','RosterBotSchema5'],
  ['js/03-recovery-ui.js','03-recovery-ui','RosterBotRecoveryUI'],
  ['js/03-schema5-migration.js','03-schema5-migration','RosterBotSchema5Migration']
];

test('the boot collector precedes every external script and preserves first-error diagnostics without storage data',()=>{
  const html=readSource('index.html'),collector=html.indexOf('id="rosterbotBootDiagnostics"'),collectorEnd=html.indexOf('</script>',collector),firstExternal=html.indexOf('<script src=');
  assert(collector>=0&&collector<firstExternal);
  assert.match(html,/window\.onerror/);assert.match(html,/addEventListener\('error'/);assert.match(html,/addEventListener\('unhandledrejection'/);
  assert.match(html,/target&&target\.src/);assert.match(html,/failed to load:/);
  assert.match(html,/if\(!firstError\)/);assert.match(html,/RosterBot could not start correctly/);assert.match(html,/Copy technical diagnostic/);
  assert.doesNotMatch(html.slice(collector,collectorEnd),/localStorage|getItem\(|indexedDB\.open/);
});

test('foundational modules mark start/completion and publish without Web Crypto, IndexedDB or localStorage',()=>{
  const markers=[],window={__rosterbotRequireBuildComponent:()=>true,RosterBotBootDiagnostics:{start:(...args)=>markers.push(['start',...args]),complete:(...args)=>markers.push(['complete',...args]),dependency(module,expected){throw new Error(`${module} expected ${expected}`)}}},context=vm.createContext({window,globalThis:window,document:{currentScript:{src:'https://diagnostic.invalid/module.js'}},console,TextEncoder:undefined});
  for(const [file,moduleName,globalName] of modules){vm.runInContext(readSource(file),context,{filename:file});assert(window[globalName],`${file} did not publish ${globalName}`);assert(markers.some(row=>row[0]==='start'&&row[1]===moduleName));assert(markers.some(row=>row[0]==='complete'&&row[1]===moduleName&&row[2]===globalName))}
  assert.equal('crypto'in window,false);assert.equal('indexedDB'in window,false);assert.equal('localStorage'in window,false);
});

test('dependency failures are explicit at the module boundary instead of becoming null dereferences',()=>{
  const cases=[
    ['js/02-canonical-state.js','02-canonical-state expected persistence registry'],
    ['js/02-persistence-safety.js','02-persistence-safety expected canonical persistence'],
    ['js/02-schema5.js','02-schema5 expected persistence registry'],
    ['js/03-schema5-migration.js','03-schema5-migration expected persistence registry']
  ];
  for(const [file,expected] of cases){
    const window={__rosterbotRequireBuildComponent:()=>true,RosterBotBootDiagnostics:{start(){},complete(){},dependency(module,dependency){throw new Error(`RosterBot startup dependency missing:\n${module} expected ${dependency}`)}}},context=vm.createContext({window,globalThis:window,document:{currentScript:{src:file}},console});
    assert.throws(()=>vm.runInContext(readSource(file),context,{filename:file}),new RegExp(expected));
  }
  const bootstrap=readSource('js/03-persistence-bootstrap.js');
  for(const dependency of ['storage compatibility','persistence registry','persistence safety','recovery UI','schema-5 migration'])assert(bootstrap.includes(`requireDependency('${dependency}'`));
  assert.match(bootstrap,/RosterBot startup dependency missing/);
});

test('diagnostic UI is separate from recovery and contains no destructive action',()=>{
  const html=readSource('index.html'),collector=html.slice(html.indexOf('id="rosterbotBootDiagnostics"'),html.indexOf('<link rel="stylesheet"'));
  assert.doesNotMatch(collector,/data-recovery-choice|data-recovery-clear-confirm|Clear and start again/);
  assert.match(collector,/saved data has not been changed/i);
  const errorHandler=readSource('js/00-error-handler.js');assert.match(errorHandler,/first\.foundational/);assert.match(errorHandler,/diagnostics\.show\(\)/);
});
