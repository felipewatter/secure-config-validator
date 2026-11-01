const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluate}=require('../dist/src/rules.js');
const E=(key,value,line=1)=>({key,value,line});
const prod={mode:'production',format:'env'};
const names=(x,o=prod)=>evaluate(x,o).map(f=>f.rule);
test('DEBUG flags only exact enabled key in production',()=>{
  assert.deepEqual(names([E('DEBUG','true')]),['debug-enabled']);
  assert.deepEqual(names([E('NOT_DEBUG','true'),E('DEBUG_LOG','true'),E('DEBUG',false)]),[]);
  assert.deepEqual(names([E('DEBUG',true)],{...prod,mode:'development'}),[]);
});
test('CORS wildcard and allow-all boolean flagged',()=>{
  assert.deepEqual(names([E('ALLOW_ALL_ORIGINS',true),E('corsOrigin','*')]),['permissive-cors','permissive-cors']);
  assert.deepEqual(names([E('CORS_ORIGIN','https://example.test')]),[]);
});
test('TLS verification disabled is critical even in development',()=>{
  const a=[E('NODE_TLS_REJECT_UNAUTHORIZED','0'),E('tlsVerify',false),E('insecureSkipVerify','true')];
  assert.equal(names(a).filter(x=>x==='tls-verification-disabled').length,3);
  assert.equal(names(a,{...prod,mode:'development'}).length,3);
});
test('insecure cookies rejected in production',()=>{
  const a=[E('SESSION_COOKIE_SECURE',false),E('COOKIE_HTTP_ONLY','false')];
  assert.deepEqual(names(a),['httponly-disabled','insecure-cookie']);
  assert.deepEqual(names(a,{...prod,mode:'development'}),[]);
});
test('weak secrets flagged, template references ignored',()=>{
  const a=[E('PASSWORD','changeme'),E('JWT_SECRET','12345'),
    E('API_KEY','$'+'{API_KEY}'),E('AUTH_TOKEN','{{TOKEN}}')];
  const f=evaluate(a,prod);assert.equal(f.length,2);
  assert.ok(f.every(x=>x.rule==='weak-credential'));
  assert.ok(!JSON.stringify(f).includes('changeme'));
});
test('strong static secrets in JSON/YAML generate medium notice',()=>{
  const a=[E('JWT_SECRET','a_long_unpredictable_secret_for_testing_2026')];
  assert.deepEqual(names(a,prod),[]);
  assert.deepEqual(names(a,{...prod,format:'json'}),['embedded-credential']);
  assert.deepEqual(names(a,{...prod,format:'yaml'}),['embedded-credential']);
});
test('unrelated text does not trigger key checks or print values',()=>{
  assert.deepEqual(evaluate([E('INFO','DEBUG=true PASSWORD=changeme')],prod),[]);
  const found=evaluate([E('password','my_very_long_private_value')],{...prod,format:'json'});
  assert.equal(JSON.stringify(found).includes('my_very_long_private_value'),false);
});
test('untrusted field names are canonicalized in reports',()=>{
  const f=evaluate([E('user_api_key_sensitive_source_name','12345')],prod);
  assert.equal(f.length,1);assert.equal(f[0].key,'CREDENTIAL');
  assert.equal(JSON.stringify(f).includes('sensitive_source_name'),false);
});
