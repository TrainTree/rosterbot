import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
export const root=path.resolve(here,'../..');
export const fixtures=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/persistence-v029.json'),'utf8')).scenarios;

export function storedValue(value){
  if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===1&&Object.hasOwn(value,'$raw'))return String(value.$raw);
  return typeof value==='string'?value:JSON.stringify(value);
}
export class MemoryStorage{
  constructor(values={}){this.map=new Map(Object.entries(values).map(([key,value])=>[key,storedValue(value)]))}
  get length(){return this.map.size}
  key(index){return [...this.map.keys()][index]??null}
  getItem(key){return this.map.has(String(key))?this.map.get(String(key)):null}
  setItem(key,value){this.map.set(String(key),String(value))}
  removeItem(key){this.map.delete(String(key))}
  clear(){this.map.clear()}
  keys(){return [...this.map.keys()]}
}
export function idbRows(scenario){return (scenario.indexedDb||[]).map(row=>({...row,value:storedValue(row.value)}))}
export function readSource(relative){return fs.readFileSync(path.join(root,relative),'utf8')}
