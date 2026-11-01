/** Security policy operates on parsed key/value pairs, never on raw source lines. */
export type Severity='medium'|'high'|'critical';
export type Mode='production'|'development';
export type Finding={rule:string;severity:Severity;key:string;line:number|null};
export type Entry={key:string;value:unknown;line:number|null};
export interface PolicyOptions{mode:Mode;format:'env'|'json'|'yaml'}
const norm=(name:string)=>name.replace(/([a-z])([A-Z])/g,'$1_$2').replace(/[^a-zA-Z0-9]+/g,'_').toUpperCase();
const boolTrue=(x:unknown)=>x===true||(typeof x==='string'&&['1','true','yes','on','enabled'].includes(x.toLowerCase().trim()));
const boolFalse=(x:unknown)=>x===false||(typeof x==='string'&&['0','false','no','off','disabled'].includes(x.toLowerCase().trim()));
const displayKey=(name:string):string=>{
  const key=norm(name);
  // Avoid treating untrusted object names as a safe reporting surface.
  const known=['DEBUG','ALLOW_ALL_ORIGINS','CORS_ORIGIN','CORS_ALLOWED_ORIGINS',
    'NODE_TLS_REJECT_UNAUTHORIZED','TLS_VERIFY','SSL_VERIFY','VERIFY_SSL',
    'INSECURE_SKIP_VERIFY','COOKIE_SECURE','SESSION_COOKIE_SECURE',
    'COOKIE_HTTP_ONLY','HTTP_ONLY','SESSION_COOKIE_HTTP_ONLY','ALLOW_INSECURE_HTTP'];
  if(known.includes(key))return key;
  if(/(?:^|_)(?:PASSWORD|PASSWD)(?:$|_)/.test(key))return 'PASSWORD';
  if(/(?:^|_)(?:SECRET|TOKEN|API_KEY|PRIVATE_KEY|ACCESS_KEY)(?:$|_)/.test(key))return 'CREDENTIAL';
  return 'CONFIG_FIELD';
};
const credential=(key:string):boolean=>
  /(?:^|_)(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|ACCESS_KEY)(?:$|_)/.test(key);
const weak=(s:string):boolean=>{
  const value=s.toLowerCase().trim();
  if(!value)return false;
  if(/^(?:changeme|change_me|change-me|default|password|password123|12345|123456|admin|test|testing|example|secret|qwerty|letmein|your[_-]?(?:secret|password|token)|replace[_-]?me)$/.test(value))return true;
  return value.length<12 && !/^\$\{[A-Z_][A-Z0-9_]*\}$/.test(s) && !/^\{\{.+\}\}$/.test(s);
};
const placeholder=(s:string):boolean=>/^(?:\$\{[A-Za-z_][A-Za-z0-9_]*\}|\{\{[^{}]+\}\})$/.test(s.trim());
/** No finding contains a configured value or a source line. */
export function evaluate(entries:readonly Entry[],options:PolicyOptions):Finding[]{
  const findings:Finding[]=[];
  const append=(entry:Entry,rule:string,severity:Severity)=>{
    if(findings.length>=1000)throw Error('Too many findings; validation incomplete');
    findings.push({rule,severity,key:displayKey(entry.key),line:entry.line});
  };
  for(const entry of entries){
    const key=norm(entry.key);
    const val=entry.value;
    if(val!==null && typeof val!=='string' && typeof val!=='boolean' && typeof val!=='number')continue;
    if(options.mode==='production' && key==='DEBUG' && boolTrue(val))
      append(entry,'debug-enabled','high');
    if(options.mode==='production' && (key==='ALLOW_ALL_ORIGINS'&&boolTrue(val) ||
       (key==='CORS_ORIGIN'||key==='CORS_ALLOWED_ORIGINS') && typeof val==='string'&&val.trim()==='*'))
      append(entry,'permissive-cors','high');
    if((key==='NODE_TLS_REJECT_UNAUTHORIZED'&&(val===0||val==='0')) ||
      (['TLS_VERIFY','SSL_VERIFY','VERIFY_SSL'].includes(key)&&boolFalse(val))||
      (key==='INSECURE_SKIP_VERIFY'&&boolTrue(val)))
      append(entry,'tls-verification-disabled','critical');
    if(options.mode==='production' &&
      ['COOKIE_SECURE','SESSION_COOKIE_SECURE'].includes(key)&&boolFalse(val))
      append(entry,'insecure-cookie','high');
    if(options.mode==='production' &&
      ['COOKIE_HTTP_ONLY','HTTP_ONLY','SESSION_COOKIE_HTTP_ONLY'].includes(key)&&boolFalse(val))
      append(entry,'httponly-disabled','high');
    if(options.mode==='production'&&key==='ALLOW_INSECURE_HTTP'&&boolTrue(val))
      append(entry,'unencrypted-http-enabled','high');
    if(credential(key)&&typeof val==='string'&&val.trim()!==''){
      if(placeholder(val))continue;
      if(weak(val))append(entry,'weak-credential','high');
      else if(options.format!=='env')append(entry,'embedded-credential','medium');
    }
  }
  findings.sort((a,b)=>(a.line??0)-(b.line??0)||a.rule.localeCompare(b.rule)||a.key.localeCompare(b.key));
  return findings;
}
/** Backward-compatible export; policies are now structured and exact-key based. */
export const rules=Object.freeze(['debug-enabled','permissive-cors','tls-verification-disabled',
  'insecure-cookie','httponly-disabled','unencrypted-http-enabled','weak-credential','embedded-credential']);
