const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {mkdtempSync,writeFileSync,rmSync,symlinkSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {parseArgs}=require('../dist/bin/index.js');
const cli=join(__dirname,'..','dist','bin','index.js');
const make=()=>mkdtempSync(join(tmpdir(),'scv-test-'));
const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:10000});
test('CLI options and defaults are predictable',()=>{
  const x=parseArgs(['example.yaml','--format=json','--mode','development','--fail-on','medium']);
  assert.equal(x.file,'example.yaml');assert.equal(x.mode,'development');assert.equal(x.format,'json');
  assert.equal(parseArgs(['--path','file.env']).failOn,'high');
});
test('invalid CLI arguments are rejected',()=>{
  for(const a of [[],['--unknown','x'],['a.yml','--fail-on','low'],['a.yml','--mode','invalid'],['a.env','b.env'],['a.json','--max-file-bytes','9']])
    assert.throws(()=>parseArgs(a));
});
test('help and version work without configuration files',()=>{
  assert.equal(run(['--help']).status,0);assert.match(run(['--version']).stdout,/1.1.0/);
});
test('text and JSON output redact secrets and distinguish findings',()=>{
  const dir=make(),secret='SUPER_PRIVATE_VALUE_NEVER_PRINTED';
  try{
    const file=join(dir,'.env');writeFileSync(file,'DEBUG=true\nPASSWORD=changeme\nJWT_SECRET='+secret+'\n');
    const result=run([file,'--format=json']);assert.equal(result.status,1,result.stderr);
    const obj=JSON.parse(result.stdout);assert.equal(obj.status,'findings');assert.equal(obj.checkedKeys,3);
    assert.equal(obj.findings.filter(x=>x.rule==='weak-credential').length,1);
    assert.equal(result.stdout.includes('changeme'),false);assert.equal(result.stdout.includes(secret),false);
    const txt=run([file]);assert.equal(txt.status,1);assert.equal(txt.stdout.includes(secret),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('medium findings reported even when threshold passes',()=>{
  const dir=make();
  try{
    const file=join(dir,'test.json');writeFileSync(file,JSON.stringify({password:'long_private_value_from_nonprod_test_2026'}));
    const a=run([file,'--format=json']);assert.equal(a.status,0);assert.equal(JSON.parse(a.stdout).findings.length,1);
    assert.equal(run([file,'--fail-on','medium']).status,1);
    assert.equal(run([file,'--fail-on','none']).status,0);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('invalid input and extensions fail closed without echoing secrets',()=>{
  const dir=make();
  try{
    let file=join(dir,'config.yaml');writeFileSync(file,'DEBUG: [CONFIDENTIAL_PASSWD');
    const r=run([file,'--format=json']);assert.equal(r.status,2);assert.equal(r.stdout.trim(),'');
    assert.ok(!r.stderr.includes('CONFIDENTIAL_PASSWD'));
    file=join(dir,'config.txt');writeFileSync(file,'DEBUG=true');assert.equal(run([file]).status,2);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('oversized file never returns clean status',()=>{
  const dir=make();
  try{
    const file=join(dir,'large.env');writeFileSync(file,'A='+('x'.repeat(5000)));
    const r=run([file,'--max-file-bytes','1024','--format=json']);
    assert.equal(r.status,2);assert.equal(r.stdout.trim(),'');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('symlink configuration file is rejected',{skip:process.platform==='win32'},()=>{
  const dir=make();
  try{
    const target=join(dir,'source.env'),link=join(dir,'link.env');
    writeFileSync(target,'DEBUG=true');symlinkSync(target,link,'file');assert.equal(run([link]).status,2);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('JSON and YAML yield consistent findings',()=>{
  const dir=make();
  try{
    const json=join(dir,'config.json'),yaml=join(dir,'config.yaml');
    writeFileSync(json,'{"server":{"debug":true,"tlsVerify":false}}');
    writeFileSync(yaml,'server:\n  debug: true\n  tlsVerify: false\n');
    const a=JSON.parse(run([json,'--format=json']).stdout),b=JSON.parse(run([yaml,'--format=json']).stdout);
    assert.equal(a.findings.length,2);assert.equal(b.findings.length,2);
    assert.deepEqual(a.findings.map(x=>x.rule).sort(),b.findings.map(x=>x.rule).sort());
  }finally{rmSync(dir,{recursive:true,force:true});}
});
