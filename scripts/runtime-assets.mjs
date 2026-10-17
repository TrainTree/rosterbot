export const APPLICATION_VERSION='0.31.0';
export const ASSET_MANIFEST_VERSION=2;
export const BUILD_ID_PREFIX='rb-build:';
export const BUILD_ID_PLACEHOLDER=`${BUILD_ID_PREFIX}${'0'.repeat(64)}`;
export const BUILD_STAMP_PATTERN=/rb-build:[a-f0-9]{64}/g;

export const GENERATED_IDENTITY_ASSET='js/00-build-identity.js';
export const GENERATED_MANIFEST_ASSET='rosterbot-build-manifest.json';

export const FOUNDATION_ASSETS=Object.freeze([
  'js/00-canonical-origin.js',
  'js/00-error-handler.js',
  'js/01-storage-compatibility.js',
  'js/01-persistence-registry.js',
  'js/02-canonical-state.js',
  'js/02-persistence-safety.js',
  'js/02-schema5.js',
  'js/03-recovery-ui.js',
  'js/03-schema5-migration.js',
  'js/03-persistence-bootstrap.js'
]);

export const FEATURE_ASSETS=Object.freeze([
  'data/rosters-fp64-fp68-20260908.js',
  'js/10-roster-official.js',
  'js/11-roster-engine.js',
  'js/12-roster-effective-dates.js',
  'js/40-employment-profile.js',
  'js/20-roster-ui.js',
  'js/30-feedback.js',
  'js/31-changelog.js',
  'data/pay-reference-20260923.js',
  'js/41-pay-rate-official.js',
  'js/42-paybot.js',
  'js/50-data-backup.js',
  'js/04-cloud-error-contract.js',
  'js/05-cloud-deployment-profile.js',
  'js/06-cloud-config.js',
  'js/07-cloud-schema5.js',
  'js/51-cloud-sync.js',
  'js/60-diary.js',
  'js/61-page-bridge.js',
  'js/75-sources.js',
  'js/70-navigation.js',
  'js/80-calendar-subscription.js'
]);

export const STYLE_ASSETS=Object.freeze(['css/rosterbot.css']);
export const PRESENTATION_SCRIPT_ASSETS=Object.freeze(['js/00-display-mode.js']);
export const INSTALLABILITY_ASSETS=Object.freeze([
  'manifest.webmanifest',
  'assets/icons/rosterbot-192.png',
  'assets/icons/rosterbot-512.png',
  'assets/icons/rosterbot-maskable-192.png',
  'assets/icons/rosterbot-maskable-512.png',
  'assets/icons/apple-touch-icon.png'
]);
export const COSMETIC_ASSETS=Object.freeze([
  'favicon.ico',
  'assets/icons/favicon-16.png',
  'assets/icons/favicon-32.png'
]);
export const SCRIPT_ASSETS=Object.freeze([...FOUNDATION_ASSETS,...PRESENTATION_SCRIPT_ASSETS,...FEATURE_ASSETS]);
export const STAMPED_SCRIPT_ASSETS=SCRIPT_ASSETS;
export const COLD_START_ASSETS=Object.freeze([
  'index.html',
  ...STYLE_ASSETS,
  GENERATED_IDENTITY_ASSET,
  ...FOUNDATION_ASSETS,
  ...FEATURE_ASSETS
]);
export const RUNTIME_SOURCE_ASSETS=Object.freeze([
  ...COLD_START_ASSETS,
  ...PRESENTATION_SCRIPT_ASSETS,
  ...INSTALLABILITY_ASSETS,
  ...COSMETIC_ASSETS
]);
export const DEPLOYMENT_SUPPORT_ASSETS=Object.freeze(['.nojekyll','CNAME']);

export function assetCriticality(relative){
  if(COLD_START_ASSETS.includes(relative))return 'startup-critical';
  if(PRESENTATION_SCRIPT_ASSETS.includes(relative)||INSTALLABILITY_ASSETS.includes(relative))return 'installability-critical';
  if(COSMETIC_ASSETS.includes(relative))return 'cosmetic';
  throw new Error(`Runtime asset is not classified: ${relative}`);
}

export function assertRuntimeInventory(){
  const paths=[...RUNTIME_SOURCE_ASSETS,GENERATED_MANIFEST_ASSET];
  const duplicates=paths.filter((value,index)=>paths.indexOf(value)!==index);
  if(duplicates.length)throw new Error(`Duplicate runtime asset inventory entries: ${[...new Set(duplicates)].join(', ')}`);
  if(!COLD_START_ASSETS.includes('index.html'))throw new Error('Runtime inventory must contain index.html.');
  if(!COLD_START_ASSETS.includes(GENERATED_IDENTITY_ASSET))throw new Error('Runtime inventory must contain the generated build identity.');
  for(const relative of RUNTIME_SOURCE_ASSETS)assetCriticality(relative);
  return true;
}

assertRuntimeInventory();
