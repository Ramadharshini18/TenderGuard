const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--no-sandbox',
  '--disable-gpu',
  'http://localhost:5173/'
]);

const errors = [];
const consoleMessages = [];

setTimeout(() => {
  http.get('http://127.0.0.1:9224/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const target = tabs.find(t => t.url && t.url.includes('5173'));
      if (!target) { 
        console.log('No tab found at 5173. Tabs:', tabs.map(t=>t.url));
        chrome.kill(); 
        return; 
      }

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Console.enable' }));
      };

      ws.onmessage = (msg) => {
        const ev = JSON.parse(msg.data);
        if (ev.method === 'Runtime.exceptionThrown') {
          errors.push(JSON.stringify(ev.params.exceptionDetails, null, 2));
        }
        if (ev.method === 'Runtime.consoleAPICalled') {
          const args = ev.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')).join(' ');
          consoleMessages.push(`[${ev.params.type}] ${args}`);
        }
        if (ev.method === 'Log.entryAdded') {
          consoleMessages.push(`[LOG] ${ev.params.entry.level}: ${ev.params.entry.text}`);
        }
      };

      // After 4 seconds, evaluate and report
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 99,
          method: 'Runtime.evaluate',
          params: {
            expression: `JSON.stringify({
              rootInnerHTML: document.getElementById('root') ? document.getElementById('root').innerHTML.substring(0, 500) : 'NO ROOT',
              bodyText: document.body ? document.body.innerText.substring(0, 300) : 'NO BODY',
              hasReact: !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
              location: window.location.href
            })`
          }
        }));
      }, 3500);

      ws.onmessage = (msg) => {
        const ev = JSON.parse(msg.data);
        if (ev.method === 'Runtime.exceptionThrown') {
          errors.push(JSON.stringify(ev.params.exceptionDetails));
        }
        if (ev.method === 'Runtime.consoleAPICalled') {
          const args = ev.params.args.map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ');
          consoleMessages.push(`[${ev.params.type.toUpperCase()}] ${args}`);
        }
        if (ev.id === 99) {
          console.log('=== BROWSER STATE ===');
          try { console.log(JSON.parse(ev.result.result.value)); } catch(e) { console.log(ev.result); }
          console.log('\n=== CONSOLE MESSAGES ===');
          consoleMessages.forEach(m => console.log(m));
          console.log('\n=== JS ERRORS ===');
          if (errors.length === 0) console.log('No JS errors caught.');
          errors.forEach(e => console.log(e));
          chrome.kill();
          process.exit(0);
        }
      };
    });
  });
}, 2500);
