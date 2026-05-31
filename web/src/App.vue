<template>
  <nav class="sidebar">
    <div class="brand"><h1>AIChatBot</h1></div>
    <router-link class="nav-item" to="/">仪表盘</router-link>
    <router-link class="nav-item" to="/logs">日志</router-link>
    <router-link class="nav-item" to="/settings">设置</router-link>
  </nav>
  <div class="main"><router-view /></div>
  <div class="toast" id="toast"></div>
</template>

<style>
@import './style.css';
</style>
