/** Parsers do not perform interpolation, code execution, include resolution, or network I/O. */
import path from 'node:path';
import YAML from 'yaml';
import type {Entry} from './rules';
export type FileFormat='env'|'json'|'yaml';
export function fileFormat(filename:string):FileFormat{
  const name=path.basename(filename).toLowerCase();
  if(name==='.env'||/^\.env\.[a-z0-9_-]+$/.test(name)||name.endsWith('.env'))return 'env';
  if(name.endsWith('.json'))return 'json';
  if(name.endsWith('.yaml')||name.endsWith('.yml'))return 'yaml';
  throw Error('Unsupported config extension: use .env, .json, .yaml or .yml');
}
function parseEnv(source:string):Entry[]{
  const entries:Entry[]=[];
  const keys=new Set<string>();
  const lines=source.replace(/^\uFEFF/,'').split(/\r?\n/);
  if(lines.length>10000)throw Error('Too many .env lines');
  for(let i=0;i<lines.length;i++){
    const line=lines[i]!;
    if(!line.trim()||/^\s*#/.test(line))continue;
    const match=/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if(!match)throw Error('Malformed .env assignment');
    const key=match[1]!,raw=match[2]!;
    if(keys.has(key))throw Error('Duplicate .env configuration key');
    keys.add(key);
    let value:string;
    if(raw.startsWith('"')){
      const quoted=/^"((?:\\.|[^"\\])*)"\s*(?:#.*)?$/.exec(raw);
      if(!quoted)throw Error('Unterminated or malformed double-quoted .env value');
      value=quoted[1]!.replace(/\\"/g,'"').replace(/\\\\/g,'\\');
    }else if(raw.startsWith("'")){
      const quoted=/^'([^']*)'\s*(?:#.*)?$/.exec(raw);
      if(!quoted)throw Error('Unterminated or malformed single-quoted .env value');
      value=quoted[1]!;
    }else{
      value=raw.replace(/\s+#.*$/,'').trim();
    }
    entries.push({key,value,line:i+1});
  }
  return entries;
}
function flatten(root:unknown):Entry[]{
  if(!root||typeof root!=='object'||Array.isArray(root))throw Error('Configuration root must be an object');
  const entries:Entry[]=[];
  const seen=new Set<object>();
  let visited=0;
  function walk(obj:unknown,depth:number):void{
    if(depth>24||++visited>10000)throw Error('Config nesting/entry limit exceeded');
    if(obj===null||typeof obj!=='object')return;
    if(seen.has(obj))throw Error('Cyclic configuration object');
    seen.add(obj);
    if(Array.isArray(obj)){
      for(const item of obj)walk(item,depth+1);
    }else{
      for(const [key,value] of Object.entries(obj)){
        if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe configuration key');
        if(value!==null&&typeof value==='object')walk(value,depth+1);
        else entries.push({key,value,line:null});
      }
    }
    seen.delete(obj);
  }
  walk(root,0);
  return entries;
}
export function parseConfig(source:string,format:FileFormat):Entry[]{
  if(source.includes('\u0000'))throw Error('Binary content cannot be parsed as config');
  if(format==='env')return parseEnv(source);
  if(format==='json'){
    let root:unknown;try{root=JSON.parse(source)}catch{throw Error('Invalid JSON syntax')}
    return flatten(root);
  }
  try{
    const doc=YAML.parseDocument(source,{schema:'core',strict:true,uniqueKeys:true,version:'1.2'});
    if(doc.errors.length||doc.warnings.length||!doc.contents)throw Error('Invalid YAML document');
    const root:unknown=doc.toJS({maxAliasCount:0});
    return flatten(root);
  }catch{throw Error('Invalid, unsupported or unsafe YAML document');}
}
