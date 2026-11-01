const {test}=require('node:test');
const assert=require('node:assert/strict');
const {fileFormat,parseConfig}=require('../dist/src/parser.js');
test('formats are selected by extension',()=>{
  for(const [n,f] of [['.env','env'],['.env.production','env'],['app.env','env'],['config.json','json'],['config.yaml','yaml'],['config.yml','yaml']])
    assert.equal(fileFormat(n),f);
  assert.throws(()=>fileFormat('config.txt'));
});
test('env parses quotes, export, comments and line numbers',()=>{
  const x=parseConfig('#comment\nexport DEBUG="true" # note\nPASSWORD=\'changeme\'\nNAME=public # hint','env');
  assert.deepEqual(x,[{key:'DEBUG',value:'true',line:2},{key:'PASSWORD',value:'changeme',line:3},{key:'NAME',value:'public',line:4}]);
});
test('invalid env syntax and duplicates are errors',()=>{
  for(const text of ['incorrect line','DEBUG=true\nDEBUG=false','DEBUG="unterminated','export 123=bad'])
    assert.throws(()=>parseConfig(text,'env'));
  assert.equal(parseConfig('PASSWORD=','env')[0].value,'');
});
test('env values never execute or interpolate expressions',()=>{
  const text='SECRET="$(echo dangerous)"\nDEBUG=$'+'{ENABLE_DEBUG}\n';
  const e=parseConfig(text,'env');assert.equal(e[0].value,'$(echo dangerous)');assert.equal(e[1].value,'$'+'{ENABLE_DEBUG}');
});
test('binary bytes and excessive env lines rejected',()=>{
  assert.throws(()=>parseConfig('A=x\u0000','env'));
  assert.throws(()=>parseConfig('K=x\n'.repeat(10001),'env'));
});
test('JSON parses nested properties, not substrings',()=>{
  const e=parseConfig('{"server":{"DEBUG":true,"tlsVerify":false},"credentials":{"password":"password"}}','json');
  assert.deepEqual(e.map(x=>x.key),['DEBUG','tlsVerify','password']);
  assert.ok(e.every(x=>x.line===null));
});
test('JSON malformed, unsafe keys, nonmapping roots and extreme depth fail',()=>{
  for(const src of ['[]','null','{','"value"','{"__proto__":{"secret":"x"}}'])assert.throws(()=>parseConfig(src,'json'));
  let x={DEBUG:true};for(let i=0;i<26;i++)x={nested:x};
  assert.throws(()=>parseConfig(JSON.stringify(x),'json'),/limit/);
});
test('YAML nested mappings and sequences are safely parsed',()=>{
  const src='server:\n  debug: true\n  origins:\n    allowAllOrigins: true\narr:\n  - password: changeme\n';
  const e=parseConfig(src,'yaml');assert.deepEqual(e.map(x=>x.key),['debug','allowAllOrigins','password']);
  assert.equal(e[0].value,true);
});
test('YAML duplicate keys, malformed docs, aliases and arrays rejected',()=>{
  for(const src of ['config: [bad','DEBUG: true\nDEBUG: false','hello: &a bad\ncopy: *a\n','- DEBUG: true'])
    assert.throws(()=>parseConfig(src,'yaml'));
});
test('YAML executable custom tags are rejected',()=>assert.throws(()=>parseConfig('a: !!js/function "() => 3"','yaml')));
