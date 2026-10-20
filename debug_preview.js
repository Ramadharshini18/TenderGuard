const { spawn } = require('child_process');
const http = require('http');

const TARGET_URL = 'http://localhost:4173/';

const chrome = spawn('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--no-sandbox',
  TARGET_URL
]);

const errors = [];
const consoleMsgs = [];

setTimeout(() => {
  http.get('http://127.0.0.1:9226/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const target = tabs.find(t => t.url && t.url.includes('4173'));
      if (!target) {
        console.log('No tab at 4173. All tabs:', tabs.map(t=>t.url));
        chrome.kill();
        return;
      }

      const ws = new WebSocket(target.webSocketDebuggerUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      };

      ws.onmessage = (msg) => {
        const ev = JSON.parse(msg.data);
        if (ev.method === 'Runtime.exceptionThrown') {
          const d = ev.params.exceptionDetails;
          errors.push(`${d.text}: ${d.exception?.description || d.exception?.value || ''}`);
        }
        if (ev.method === 'Runtime.consoleAPICalled') {
          const args = ev.params.args.map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
          consoleMsgs.push(`[${ev.params.type.toUpperCase()}] ${args}`);
        }
        if (ev.method === 'Log.entryAdded') {
          const e = ev.params.entry;
          consoleMsgs.push(`[${e.level.toUpperCase()}] ${e.text}`);
        }
        if (ev.id === 99) {
          const val = ev.result?.result?.value;
          let state;
          try { state = JSON.parse(val); } catch(e) { state = val; }
          console.log('=== BROWSER STATE ===');
          console.log(JSON.stringify(state, null, 2));
          console.log('\n=== CONSOLE MESSAGES ===');
          consoleMsgs.forEach(m => console.log(m));
          console.log('\n=== JS ERRORS ===');
          if (errors.length === 0) console.log('None caught');
          errors.forEach(e => console.log(e));
          chrome.kill();
          process.exit(0);
        }
      };

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 99,
          method: 'Runtime.evaluate',
          params: {
            expression: [
              'JSON.stringify({',
              '  rootHTML: (document.getElementById("root")||{}).innerHTML || "NO ROOT",',
              '  bodyText: (document.body||{}).innerText || "NO BODY",',
              '  title: document.title,',
              '  hasReact: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__',
              '})'
            ].join('')
          }
        }));
      }, 5000);
    });
  });
}, 2000);
