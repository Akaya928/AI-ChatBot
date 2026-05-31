import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './components/Dashboard.vue'
import Settings from './components/Settings.vue'
import Logs from './components/Logs.vue'

const routes = [
  { path: '/', component: Dashboard },
  { path: '/settings', component: Settings },
  { path: '/logs', component: Logs },
]

const router = createRouter({ history: createWebHashHistory(), routes })
createApp(App).use(router).mount('#app')
