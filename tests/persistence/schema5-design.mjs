import {createRequire} from 'node:module';
import {root} from './helpers.mjs';

// Phase 9 promotes the Phase 7A executable contract into browser-loaded code.
// The golden tests use this adapter so production and test behavior cannot
// drift into independent migration implementations.
const require=createRequire(import.meta.url);
const schema5=require(`${root}/js/02-schema5.js`);

export const {
  SCHEMA5_FORMAT,SCHEMA5_FORMAT_VERSION,SCHEMA5_STORAGE_SCHEMA,
  SCHEMA5_MINIMUM_READER_SCHEMA,SCHEMA5_CHECKSUM_SCOPE,
  SCHEMA5_CANONICALISATION,SNAPSHOT_FORMAT,JOURNAL_STATES,JOURNAL_CONTRACT,
  schema5Identity,validateSchema5Envelope,migrateSchema4To5,
  classifySchema4Installation,makePreMigrationSnapshot
}=schema5;
