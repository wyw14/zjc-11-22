import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import StoryList from './components/StoryList.vue';
import StoryDetail from './components/StoryDetail.vue';
import AdminPanel from './components/AdminPanel.vue';

const routes = [
  { path: '/', component: StoryList },
  { path: '/story/:id', component: StoryDetail, name: 'story' },
  { path: '/admin', component: AdminPanel, name: 'admin' }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

createApp(App).use(router).mount('#app');
