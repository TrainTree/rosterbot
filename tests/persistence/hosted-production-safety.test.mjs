import test from 'node:test';
import assert from 'node:assert/strict';
import {readSource} from './helpers.mjs';
import {HOSTED_PRODUCTION_OPT_IN,hostedProductionEnabled,runHostedProductionIfEnabled} from '../browser/phase10a-hosted-policy.mjs';

test('Phase 10A hosted production compatibility is exact explicit opt-in and default invocation performs no action',async()=>{
  assert.equal(HOSTED_PRODUCTION_OPT_IN,'PHASE10A_ENABLE_HOSTED_PRODUCTION');
  for(const environment of [{},{PHASE10A_HOSTED:'1'},{PHASE10A_SKIP_HOSTED:'0'},{PHASE10A_ENABLE_HOSTED_PRODUCTION:'true'},{PHASE10A_ENABLE_HOSTED_PRODUCTION:'0'}])assert.equal(hostedProductionEnabled(environment),false);
  assert.equal(hostedProductionEnabled({PHASE10A_ENABLE_HOSTED_PRODUCTION:'1'}),true);
  let productionRequests=0;
  const skipped=await runHostedProductionIfEnabled(async()=>{productionRequests++;return {skipped:false}},{environment:{}});
  assert.deepEqual(skipped,{skipped:true,reason:'requires explicit PHASE10A_ENABLE_HOSTED_PRODUCTION=1 opt-in',productionRequests:0});
  assert.equal(productionRequests,0);
});

test('Phase 10A harness guards the hosted function and contains no legacy default-enable switch',()=>{
  const source=readSource('tests/browser/phase10a-real-browser.mjs');
  assert.match(source,/if\(!hostedProductionEnabled\(process\.env\)\)throw new Error\('Hosted production compatibility requires explicit PHASE10A_ENABLE_HOSTED_PRODUCTION=1 opt-in\.'\)/);
  assert.match(source,/runHostedProductionIfEnabled\(hostedProductionUpgrade,\{environment:process\.env\}\)/);
  assert.doesNotMatch(source,/PHASE10A_SKIP_HOSTED|PHASE10A_HOSTED/);
});
