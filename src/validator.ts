import {lstatSync,openSync,readFileSync,closeSync,fstatSync} from 'node:fs';
import path from 'node:path';
import {parseConfig,fileFormat,type FileFormat} from './parser';
import {evaluate,type Finding,type Mode} from './rules';
export type ValidationResult={
  version:1;format:FileFormat;mode:Mode;status:'clean'|'findings';
  checkedKeys:number;findings:Finding[];
};
export type ValidateOptions={mode?:Mode;maxFileBytes?:number};
export function validateConfigDetailed(input:string,opts:ValidateOptions={}):ValidationResult{
  const filename=path.resolve(input);
  const mode=opts.mode??'production';
  if(mode!=='production'&&mode!=='development')throw Error('Invalid mode');
  const max=opts.maxFileBytes??1024*1024;
  if(!Number.isSafeInteger(max)||max<1024||max>8*1024*1024)throw Error('Invalid size limit');
  const format=fileFormat(filename);
  const st=lstatSync(filename);
  if(!st.isFile()||st.isSymbolicLink())throw Error('Config must be a regular non-symlink file');
  if(st.size>max)throw Error('Config file exceeds maximum bytes');
  const flags=require('node:fs').constants.O_RDONLY |
    (process.platform!=='win32'&&typeof require('node:fs').constants.O_NOFOLLOW==='number'
      ?require('node:fs').constants.O_NOFOLLOW:0);
  const fd=openSync(filename,flags);
  let data:Buffer;
  try{
    const now=fstatSync(fd);
    if(!now.isFile()||now.size>max||now.dev!==st.dev||now.ino!==st.ino)
      throw Error('Configuration file changed or is unsafe');
    data=readFileSync(fd);
    if(data.length>max)throw Error('Config size changed during read');
  }finally{closeSync(fd)}
  const source=new TextDecoder('utf-8',{fatal:true}).decode(data);
  const entries=parseConfig(source,format);
  const findings=evaluate(entries,{mode,format});
  return{version:1,format,mode,status:findings.length?'findings':'clean',checkedKeys:entries.length,findings};
}
/** Compatibility wrapper: output only rule/key/line, never source values. */
export function validateConfig(filePath:string):string[]{
  return validateConfigDetailed(filePath).findings.map(x=>x.rule+' ('+x.key+')'+(x.line===null?'':':'+x.line));
}
