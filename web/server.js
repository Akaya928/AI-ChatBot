const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PANEL_PORT ? parseInt(process.env.PANEL_PORT) : 5777;
const ROOT = path.join(__dirname, '..');
const NAPCAT_DIR = process.env.NAPCAT_DIR || path.join(ROOT, 'NapCat.Shell', 'NapCat.44498.Shell');
const NODE = process.env.NODE_PATH || 'node';
const BOT_QQ = process.env.BOT_SELF_ID || BOT_QQ;
const BOT_MAIN = path.join(ROOT, 'dist', 'index.js');
const BOT_LOG = path.join(ROOT, 'data', 'logs', 'bot.log');
const CONFIG_PATH = path.join(ROOT, 'data', 'config.json');
const PANEL_PID = process.pid;

const DEFAULT_CONFIG = {
  character: { name: '钖勪竴澶?, personality: '', speechStyle: '', background: '' },
  ai: { apiKey: '', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  memory: { profileExtractionInterval: 10, shortTermLimit: 20 },
  bot: { stickerSearchEnabled: true, emojiEnabled: true }
};
function loadCfg() { try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch { return { ...DEFAULT_CONFIG }; } }
function saveCfg(c) { fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2), 'utf8'); }

function checkNapCat() { return new Promise(r => exec('tasklist /fi "imagename eq QQ.exe" /fo csv /nh', (e,o) => r({ qq: (o||'').includes('QQ.exe') }))); }
function checkBot() { return new Promise(r => exec(`wmic process where "name='node.exe' and commandline like '%index.js%'" get processid /format:csv`, (e,o) => { const p = (o||'').trim().split('\n').filter(l=>l.includes(',')).map(l=>l.split(',').pop().trim()).filter(p=>p&&p!==String(PANEL_PID)); r({ running: p.length>0 }); })); }

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (r,s) => s.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.get('/api/status', async (r,s) => { const [n,b] = await Promise.all([checkNapCat(),checkBot()]); s.json({napcat:n,bot:b}); });
app.get('/api/config', (r,s) => s.json(loadCfg()));
app.post('/api/config', (r,s) => { saveCfg({...loadCfg(),...r.body}); s.json({ok:true}); });
app.get('/api/logs', (r,s) => { try { s.json({lines:fs.readFileSync(BOT_LOG,'utf8').split('\n').slice(-200)}); } catch { s.json({lines:[]}); } });
app.post('/api/logs/clear', (r,s) => { try { fs.writeFileSync(BOT_LOG, '', 'utf8'); s.json({ok:true}); } catch { s.json({ok:false}); } });

['napcat','bot'].forEach(svc => {
  app.post(`/api/actions/${svc}/start`, async (r,s) => {
    if (svc==='bot') {
      const b = await checkBot();
      if (b.running) return s.json({ok:true,msg:'Bot 宸插湪杩愯'});
      const o=fs.openSync(BOT_LOG,'a');
      spawn(NODE, ['-r','dotenv/config',BOT_MAIN], {cwd:ROOT,detached:true,windowsHide:true,stdio:['ignore',o,o]}).unref();
    }
    if (svc==='napcat') {
      const n = await checkNapCat();
      if (n.qq) return s.json({ok:true,msg:'NapCat 宸插湪杩愯'});
      spawn(path.join(NAPCAT_DIR,'NapCatWinBootMain.exe'), [BOT_QQ], {cwd:NAPCAT_DIR,detached:true,windowsHide:true,stdio:'ignore'}).unref();
    }
    s.json({ok:true,msg:svc==='napcat'?'NapCat 姝ｅ湪鍚姩...':'Bot 宸插惎鍔?});
  });
  app.post(`/api/actions/${svc}/stop`, (r,s) => {
    if (svc==='napcat') exec('taskkill /f /im QQ.exe 2>nul & taskkill /f /im NapCatWinBootMain.exe 2>nul', () => s.json({ok:true,msg:'NapCat 宸插叧闂?}));
    else exec(`wmic process where "name='node.exe' and commandline like '%index.js%'" get processid /format:csv`, (e,o) => {
      const p = (o||'').trim().split('\n').filter(l=>l.includes(',')).map(l=>l.split(',').pop().trim()).filter(p=>p&&p!==String(PANEL_PID));
      if (p.length) exec(`taskkill /f ${p.map(x=>'/pid '+x).join(' ')} 2>nul`, () => s.json({ok:true,msg:'Bot 宸插叧闂?}));
      else s.json({ok:true,msg:'Bot 鏈繍琛?});
    });
  });
});

app.listen(PORT, () => console.log(`[Panel] http://localhost:${PORT}`));

// NapCat watchdog: daily refresh at 4am + 5-min health check
setInterval(() => {
  const now = new Date();
  const is4am = now.getHours() === 4 && now.getMinutes() === 0;
  checkNapCat().then(n => {
    if (!n.qq || is4am) {
      const reason = is4am ? "瀹氭椂鍒锋柊" : "妫€娴嬪埌QQ绂荤嚎锛岃嚜鍔ㄦ媺璧?;
      console.log(`[Watchdog] ${reason}`);
      exec('taskkill /f /im QQ.exe 2>nul & taskkill /f /im NapCatWinBootMain.exe 2>nul', () => {
        setTimeout(() => {
          spawn(path.join(NAPCAT_DIR, 'NapCatWinBootMain.exe'), [BOT_QQ], {
            cwd: NAPCAT_DIR, detached: true, windowsHide: true, stdio: 'ignore'
          }).unref();
        }, 5000);
      });
    }
  });
}, 60000);

