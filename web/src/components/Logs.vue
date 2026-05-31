<template>
<div>
  <div class="page-header" style="display:flex;align-items:center;justify-content:space-between">
    <div><h2>日志</h2><p>最近 200 行，每 5 秒刷新</p></div>
    <div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" @click="download">下载</button><button class="btn btn-ghost btn-sm" @click="clear">清空</button></div>
  </div>
  <div class="sys-bar">
    <span class="sys-item"><span :class="'status-dot '+(status.napcat?'on pulse':'off')"></span> NapCat {{ status.napcat ? '在线' : '离线' }}</span>
    <span class="sys-item"><span :class="'status-dot '+(status.bot?'on pulse':'off')"></span> Bot {{ status.bot ? '运行中' : '已停止' }}</span>
    <span class="sys-item">{{ !status.napcat && !status.bot ? '⚠ 服务离线' : '' }}</span>
  </div>
  <div class="card" style="padding:16px">
    <div class="log-viewer" v-if="html" v-html="html"></div>
    <div class="empty-state" v-else><div class="empty-icon">📄</div><p>暂无日志</p></div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { api, toast } from '../api.js'

const text = ref('')
const html = ref('')
const status = ref({ napcat: false, bot: false })
let timer = null

function colorize() {
  html.value = text.value.split('\n').map(l => {
    let cls = ''
    if (l.includes('[Private]')) cls = 'log-private'
    else if (l.includes('[Group]')) cls = 'log-group'
    else if (l.includes('[Reply]')) cls = 'log-reply'
    else if (l.includes('[Emotion]')) cls = 'log-emotion'
    else if (l.includes('[Sticker]')) cls = 'log-sticker'
    else if (l.includes('[Notice]')) cls = 'log-notice'
    else if (l.includes('错误') || l.includes('失败') || l.includes('ECONNREFUSED')) cls = 'log-error'
    return cls ? `<span class="${cls}">${l}</span>` : l
  }).join('\n')
}

async function load() {
  try { const d = await api.logs(); text.value = d.lines.join('\n'); colorize(); setTimeout(() => { const v = document.querySelector('.log-viewer'); if (v) v.scrollTop = v.scrollHeight }, 100) } catch(e) {}
}
async function checkStatus() {
  try { const d = await api.status(); status.value = { napcat: d.napcat.qq, bot: d.bot.running } } catch(e) {}
}
function download() {
  const b = new Blob([text.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(b)
  a.download = 'bot-log-' + new Date().toISOString().slice(0, 10) + '.txt'
  a.click()
  toast('日志已下载', 'ok')
}
async function clear() {
  try { if (!confirm('确定要清空日志吗？')) return; await fetch('/api/logs/clear', { method: 'POST' }); text.value = ''; html.value = ''; toast('日志已清空', 'ok') } catch(e) { toast('清空失败', 'err') }
}

onMounted(() => { load(); checkStatus(); timer = setInterval(() => { load(); checkStatus() }, 5000) })
onBeforeUnmount(() => clearInterval(timer))
</script>
