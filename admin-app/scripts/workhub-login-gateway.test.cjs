const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildWorkhubLoginGateway } = require('./workhub-login-gateway.cjs');
const source = '<html><script type="module" crossorigin src="/assets/main-test.js"></script></html>';
const gateway = buildWorkhubLoginGateway(source);
const script = gateway.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace('import("/assets/main-test.js")', 'loadMain()');
for (const [target, expected] of [['/workhub', true], ['/workhub/users?scope=all', true], ['/workhub/join', true], ['/lab', false], ['', false], ['//evil.example/workhub', false], ['/workhub-other', false], ['/workhub\\evil', false]]) {
 let redirect; let main = false;
 vm.runInNewContext(script, { URLSearchParams, encodeURIComponent, location: {search:'?returnTo='+encodeURIComponent(target),replace: value=>{redirect=value}}, loadMain:()=>{main=true} });
 assert.equal(!!redirect, expected, target); assert.equal(main, !expected, target);
 if (expected) assert.equal(redirect, '/workhub/login?returnTo='+encodeURIComponent(target));
}
assert.throws(()=>buildWorkhubLoginGateway('<html></html>'));
assert.throws(()=>buildWorkhubLoginGateway('<script type="module" src="https://evil.example/main.js"></script>'));
console.log('10 login gateway checks passed');
