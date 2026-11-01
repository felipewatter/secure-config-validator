#!/usr/bin/env node
import {validateConfigDetailed} from '../src/validator';
import type {Mode} from '../src/rules';

type CLI={file:string;mode:Mode;format:'text'|'json';maxFileBytes:number;failOn:'none'|'medium'|'high'|'critical'};
const HELP=[
'Secure Config Validator v1.1.0 — offline configuration security checks',
'Usage: secure-config-validator <config.env|config.json|config.yaml> [options]',
'  --path FILE             Config file (alternative to positional argument)',
'  --mode production|development   Defaults to production',
'  --format text|json      Defaults to text',
'  --fail-on none|medium|high|critical   Defaults to high',
'  --max-file-bytes NUM    Range 1024..8388608, default 1048576',
'  --help / --version      Help and version',
'Exit codes: 0=passed threshold, 1=policy findings, 2=invalid/incomplete scan.',
'No values or source lines are printed, even when invalid.'
].join('\n');
export function parseArgs(args:readonly string[]):CLI|'help'|'version'{
  const out:CLI={file:'',mode:'production',format:'text',maxFileBytes:1048576,failOn:'high'};
  for(let i=0;i<args.length;i++){
    const arg=args[i]!,idx=arg.indexOf('='),key=idx>=0?arg.slice(0,idx):arg;
    if(key==='--help'||key==='-h')return 'help';
    if(key==='--version'||key==='-v')return 'version';
    if(!key.startsWith('--')){
      if(out.file)throw Error('Only one file is allowed');
      out.file=arg;continue;
    }
    if(!['--path','--mode','--format','--fail-on','--max-file-bytes'].includes(key))throw Error('Unknown option');
    const value=idx>=0?arg.slice(idx+1):args[++i];
    if(!value||(idx<0&&value.startsWith('--')))throw Error('Missing option value');
    switch(key){
      case '--path':if(out.file)throw Error('File already selected');out.file=value;break;
      case '--mode':if(value!=='production'&&value!=='development')throw Error('Invalid mode');out.mode=value;break;
      case '--format':if(value!=='text'&&value!=='json')throw Error('Invalid format');out.format=value;break;
      case '--fail-on':if(!['none','medium','high','critical'].includes(value))throw Error('Invalid threshold');out.failOn=value as CLI['failOn'];break;
      case '--max-file-bytes':{
        if(!/^[1-9][0-9]*$/.test(value))throw Error('Invalid bytes');
        const n=Number(value);
        if(!Number.isSafeInteger(n)||n<1024||n>8388608)throw Error('Byte limit outside bounds');
        out.maxFileBytes=n;break;
      }
    }
  }
  if(!out.file)throw Error('Config file required');
  return out;
}
export async function main(args:readonly string[]=process.argv.slice(2)):Promise<number>{
  let o:ReturnType<typeof parseArgs>;
  try{o=parseArgs(args);}catch{
    console.error('Secure Config Validator: invalid arguments. Use --help.');return 2;
  }
  if(o==='help'){console.log(HELP);return 0;}
  if(o==='version'){console.log('1.1.0');return 0;}
  try{
    const r=validateConfigDetailed(o.file,{mode:o.mode,maxFileBytes:o.maxFileBytes});
    const levels={medium:1,high:2,critical:3};
    const limit=o.failOn==='none'?100:levels[o.failOn];
    const failed=r.findings.some(x=>levels[x.severity]>=limit);
    if(o.format==='json')console.log(JSON.stringify({...r,passed:!failed},null,2));
    else{
      console.log('Secure Config Validator v1.1.0');
      console.log('Format: '+r.format+' | Mode: '+r.mode+' | Checked keys: '+r.checkedKeys);
      for(const f of r.findings)console.log('['+f.severity.toUpperCase()+'] '+f.rule+' ('+f.key+')'+(f.line===null?'':':'+f.line));
      console.log('Total findings: '+r.findings.length+' | Threshold passed: '+(!failed));
    }
    return failed?1:0;
  }catch{
    // Errors may embed credentials or original source: intentionally redact entire cause.
    console.error('Secure Config Validator: could not validate configuration (invalid, unsafe or incomplete input).');
    return 2;
  }
}
if(require.main===module)void main().then(code=>{process.exitCode=code;});
