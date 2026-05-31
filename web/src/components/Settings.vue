<template>
<div class="card">
  <h2>AI 配置</h2>
  <div class="sub">修改后重启 Bot 生效</div>
  <form @submit.prevent="save" style="display:flex;flex-direction:column;gap:20px">
    <div class="form-row">
      <div class="form-field"><label>名字</label><input class="input" v-model="form.name" required></div>
      <div class="form-field"><label>AI 模型</label><select class="select" v-model="form.model"><option value="deepseek-chat">DeepSeek Chat</option><option value="deepseek-reasoner">DeepSeek Reasoner</option><option value="gpt-4o">GPT-4o</option><option value="gpt-4o-mini">GPT-4o Mini</option></select></div>
    </div>
    <div class="form-field"><label>背景故事</label><textarea class="textarea" v-model="form.background" style="min-height:60px"></textarea></div>
    <div class="form-field"><label>性格</label><textarea class="textarea" v-model="form.personality" style="min-height:60px"></textarea></div>
    <div class="form-row form-row-3">
      <div class="form-field"><label>说话风格</label><input class="input" v-model="form.speechStyle"></div>
      <div class="form-field"><label>口头禅 <span style="color:var(--text-tertiary);font-weight:400">选填</span></label><input class="input" v-model="form.catchphrase" placeholder="用逗号分隔"></div>
      <div class="form-field"><label>爱好</label><input class="input" v-model="form.hobbies" placeholder="用逗号分隔"></div>
    </div>
    <div class="form-row form-row-3">
      <div class="form-field"><label>最好朋友昵称</label><input class="input" v-model="form.bestFriendNickname" placeholder="南"></div>
      <div class="form-field"><label>最好朋友 QQ</label><input class="input" v-model="form.bestFriendQQ" placeholder="3196990846"></div>
      <div class="form-field"><label>关系描述</label><input class="input" v-model="form.bestFriendDesc" placeholder="最好的异性朋友..."></div>
    </div>
    <div class="form-row"><div class="form-field"><label>日常作息</label><input class="input" v-model="form.dailyRoutine"></div>
    <div class="form-field"><label>讨厌的事</label><input class="input" v-model="form.dislikes" placeholder="用逗号分隔"></div></div>
    <div class="form-row"><div class="form-field"><label>API Key</label><input class="input" v-model="form.apiKey" type="password" placeholder="sk-..."></div>
    <div class="form-field"><label>API 端点</label><input class="input" v-model="form.baseURL"></div></div>
    <div class="form-actions"><button type="submit" class="btn btn-primary">保存</button><button type="button" class="btn btn-ghost" @click="reset">恢复默认</button></div>
  </form>
</div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { api, toast } from '../api.js'

const form = reactive({ name:'',personality:'',speechStyle:'',catchphrase:'',hobbies:'',bestFriendNickname:'',bestFriendQQ:'',bestFriendDesc:'',dailyRoutine:'',dislikes:'',background:'',model:'deepseek-chat',apiKey:'',baseURL:'' })

onMounted(async () => {
  try {
    const d = await api.config()
    const c = d.character || {}
    form.background = c.background || ''
    form.personality = c.personality || ''
    form.speechStyle = c.speechStyle || ''
    form.catchphrase = c.catchphrase || ''
    form.hobbies = Array.isArray(c.hobbies) ? c.hobbies.join('、') : (c.hobbies || '')
    const bf = c.bestFriend || {}
    form.bestFriendNickname = bf.nickname || ''
    form.bestFriendQQ = bf.qq || ''
    form.bestFriendDesc = bf.description || ''
    form.dailyRoutine = c.dailyRoutine || ''
    form.dislikes = c.dislikes || ''
    form.name = c.name || ''
    form.apiKey = (d.ai || {}).apiKey || ''
    form.baseURL = (d.ai || {}).baseURL || ''
    form.model = (d.ai || {}).model || 'deepseek-chat'
  } catch(e) {}
})

async function save() {
  if (!form.name) { toast('名字不能为空', 'err'); return }
  try {
    const d = await api.config()
    d.character = d.character || {}
    d.character.background = form.background
    d.character.personality = form.personality
    d.character.speechStyle = form.speechStyle
    d.character.catchphrase = form.catchphrase
    d.character.hobbies = form.hobbies.split(/[,，、]/).map(s=>s.trim()).filter(Boolean)
    d.character.bestFriend = { qq: form.bestFriendQQ, nickname: form.bestFriendNickname, description: form.bestFriendDesc }
    d.character.dailyRoutine = form.dailyRoutine
    d.character.dislikes = form.dislikes
    d.character.name = form.name
    d.ai = d.ai || {}
    d.ai.apiKey = form.apiKey
    d.ai.baseURL = form.baseURL
    d.ai.model = form.model
    await api.saveConfig(d)
    toast('设置已保存，重启 Bot 生效', 'ok')
  } catch(e) { toast('保存失败', 'err') }
}

function reset() {
  Object.assign(form, {
    background:'24岁女青年，毕业于211理科大学，目前在上海从事互联网行业。最好的异性朋友叫南。',
    personality:'大方、温柔，对待不熟的人不会过于热情但保持正常沟通，偶尔会充当团队里的活跃气氛者',
    speechStyle:'自然亲切，偶尔带一丝程序员式的冷幽默',
    catchphrase:'离谱、确实',
    hobbies:'写代码、逛B站、喝奶茶',
    bestFriendNickname:'南', bestFriendQQ:'3196990846',
    bestFriendDesc:'最好的异性朋友，同岁，程序员，在他面前很放松',
    dailyRoutine:'工作日认真上班，晚上爱熬夜写代码，周末宅家或约朋友',
    dislikes:'开会、被催进度',
    name:'薄一夏', model:'deepseek-chat', apiKey:'', baseURL:'https://api.deepseek.com/v1'
  })
  toast('已恢复默认，请点击保存', 'ok')
}
</script>
