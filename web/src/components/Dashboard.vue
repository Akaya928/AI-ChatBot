<template>
<div class="card">
  <h2>服务状态</h2>
  <div class="sub">查看和控制各服务运行状态</div>
  <div class="status-grid">
    <div class="status-item">
      <div class="si-top"><div class="si-info"><h3>NapCat QQ 客户端</h3><div class="si-desc">QQ Bot 底层服务</div></div></div>
      <div class="status-indicator">
        <span :class="'status-dot '+(napcat.qq?'on pulse':'off')"></span>
        <span>{{ napcat.qq ? 'QQ 已登录' : '未运行' }}</span>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" :disabled="napcat.qq" @click="act('/api/actions/napcat/start')">启动</button>
        <button class="btn btn-ghost" :disabled="!napcat.qq" @click="act('/api/actions/napcat/stop')">关闭</button>
      </div>
    </div>
    <div class="status-item">
      <div class="si-top"><div class="si-info"><h3>AI Bot 服务</h3><div class="si-desc">智能对话引擎</div></div></div>
      <div class="status-indicator">
        <span :class="'status-dot '+(bot.running?'on pulse':'off')"></span>
        <span>{{ bot.running ? '运行中' : '未运行' }}</span>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" :disabled="bot.running" @click="act('/api/actions/bot/start')">启动</button>
        <button class="btn btn-ghost" :disabled="!bot.running" @click="act('/api/actions/bot/stop')">关闭</button>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { api, toast } from '../api.js'

const napcat = ref({ qq: false })
const bot = ref({ running: false })
let timer = null

async function refresh() {
  try { const d = await api.status(); napcat.value = d.napcat; bot.value = d.bot } catch(e) {}
}
async function act(url) {
  try { const d = await api.action(url); toast(d.msg, d.ok ? 'ok' : 'err'); refresh(); setTimeout(refresh, 2000) } catch(e) { toast('连接失败', 'err') }
}

onMounted(() => { refresh(); timer = setInterval(refresh, 5000) })
onBeforeUnmount(() => clearInterval(timer))
</script>
