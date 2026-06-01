const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 5777;
const ROOT = path.join(__dirname, '..');
const NAPCAT_DIR = path.join(ROOT, 'NapCat.Shell', 'NapCat.44498.Shell');
const NODE = 'D:\\node-v20.18.3-win-x64\\node.exe';
const BOT_QQ = '3813758946';
const BOT_MAIN = path.join(ROOT, 'dist', 'index.js');
const BOT_LOG = path.join(ROOT, 'data', 'logs', 'bot.log');
const CONFIG_PATH = path.join(ROOT, 'data', 'config.json');
const PANEL_PID = process.pid;
let lastNapcatStart = 0;

function checkNapCat() { return new Promise(r => exec('tasklist /fi "imagename eq QQ.exe" /fo csv /nh', (e,o) => r({ qq: (o||'').includes('QQ.exe') }))); }
function checkBot() { return new Promise(r => exec('wmic process where "name=\'node.exe\' and commandline like \'%index.js%\'" get processid /format:csv', (e,o) => { const p = (o||'').trim().split('\n').filter(l=>l.includes(',')).map(l=>l.split(',').pop().trim()).filter(p=>p&&p!==String(PANEL_PID)); r({ running: p.length>0 }); })); }

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/', (r,s) => s.sendFile(path.join(__dirname,'dist','index.html')));

app.get('/api/status', async (r,s) => { const [n,b] = await Promise.all([checkNapCat(),checkBot()]); s.json({napcat:n,bot:b}); });
app.get('/api/config', (r,s) => s.json(JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8'))));
app.post('/api/config', (r,s) => { fs.writeFileSync(CONFIG_PATH, JSON.stringify({...JSON.parse(fs.readFileSync(CONFIG_PATH,'utf8')),...r.body}, null, 2), 'utf8'); s.json({ok:true}); });
app.get('/api/logs', (r,s) => { try { s.json({lines:fs.readFileSync(BOT_LOG,'utf8').split('\n').slice(-200)}); } catch { s.json({lines:[]}); } });
app.post('/api/logs/clear', (r,s) => { try { fs.writeFileSync(BOT_LOG,'','utf8'); s.json({ok:true}); } catch { s.json({ok:false}); } });

app.post('/api/actions/napcat/start', async (r,s) => {
  const n = await checkNapCat();
  if (n.qq) return s.json({ok:true,msg:'NapCat already running'});
  if (Date.now() - lastNapcatStart < 10000) return s.json({ok:true,msg:'Wait 10s before retry'});
  lastNapcatStart = Date.now();
  spawn('cmd.exe', ['/c', 'start "NapCat" napcat.quick.bat'], {cwd:NAPCAT_DIR,detached:true,shell:true,stdio:'ignore'}).unref();
  s.json({ok:true,msg:'NapCat started'});
});
app.post('/api/actions/napcat/stop', (r,s) => {
  exec('taskkill /f /im QQ.exe 2>nul & taskkill /f /im NapCatWinBootMain.exe 2>nul', () => s.json({ok:true,msg:'NapCat stopped'}));
});
app.post('/api/actions/bot/start', async (r,s) => {
  const b = await checkBot();
  if (b.running) return s.json({ok:true,msg:'Bot already running'});
  const o = fs.openSync(BOT_LOG,'a');
  spawn(NODE, ['-r','dotenv/config',BOT_MAIN], {cwd:ROOT,detached:true,windowsHide:true,stdio:['ignore',o,o]}).unref();
  s.json({ok:true,msg:'Bot started'});
});
app.post('/api/actions/bot/stop', (r,s) => {
  exec('wmic process where "name=\'node.exe\' and commandline like \'%index.js%\'" get processid /format:csv', (e,o) => {
    const p = (o||'').trim().split('\n').filter(l=>l.includes(',')).map(l=>l.split(',').pop().trim()).filter(p=>p&&p!==String(PANEL_PID));
    if (p.length) exec('taskkill /f '+p.map(x=>'/pid '+x).join(' ')+' 2>nul', () => s.json({ok:true,msg:'Bot stopped'}));
    else s.json({ok:true,msg:'Bot not running'});
  });
});

app.listen(PORT, () => console.log('[Panel] http://localhost:'+PORT));
