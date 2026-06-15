<template>
  <div class="app">
    <header class="header">
      <div class="container">
        <h1 class="logo" @click="$router.push('/')">📖 微小说接力</h1>
        <nav class="nav">
          <router-link to="/" class="nav-link">故事广场</router-link>
          <router-link to="/admin" class="nav-link">管理中心</router-link>
        </nav>
      </div>
    </header>
    <main class="main">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem;
}
.logo {
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  margin: 0;
}
.nav {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
}
.nav-link {
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.nav-link:hover,
.nav-link.router-link-active {
  color: white;
  border-bottom-color: white;
}
.main {
  padding: 2rem 0;
}
</style>
