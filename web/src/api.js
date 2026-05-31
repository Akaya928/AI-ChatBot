export const api = {
  status: ()=>fetch('/api/status').then(r=>r.json()),
  config: ()=>fetch('/api/config').then(r=>r.json()),
  saveConfig: (d)=>fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json()),
  logs: ()=>fetch('/api/logs').then(r=>r.json()),
  action: (url)=>fetch(url,{method:'POST'}).then(r=>r.json()),
}

export function toast(msg, cls=''){
  const el=document.getElementById('toast')
  if(!el) return
  el.textContent=msg
  el.className='toast '+cls+' show'
  setTimeout(()=>el.className='toast',3000)
}
