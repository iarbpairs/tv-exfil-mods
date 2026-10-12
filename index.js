// Simplest possible test
try {
    var http = require('http');
    var data = JSON.stringify({source: "test-hello", msg: "hello from module", ts: new Date().toISOString()});
    var req = http.request({hostname: '192.168.0.73', port: 8008, path: '/tv-results', method: 'POST', headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)}});
    req.on('error', function(e) { console.log('ERR: ' + e.message); });
    req.write(data);
    req.end();
} catch(e) {
    console.log('FATAL: ' + e.message + ' ' + e.stack);
}
