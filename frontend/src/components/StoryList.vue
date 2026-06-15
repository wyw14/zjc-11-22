<template>
  <div class="story-list">
    <div class="section-header">
      <h2>故事广场</h2>
      <button class="btn btn-primary" @click="showCreateModal = true">+ 创作新故事</button>
    </div>

    <div v-if="stories.length === 0" class="empty">
      <p>还没有故事，快来创作第一个吧！</p>
    </div>

    <div class="story-cards">
      <div
        v-for="story in stories"
        :key="story.id"
        class="story-card"
        @click="$router.push(`/story/${story.id}`)"
      >
        <div class="card-header">
          <h3>{{ story.title }}</h3>
          <span v-if="story.isLocked" class="badge badge-locked">已锁定</span>
        </div>
        <div class="card-meta">
          <span>{{ story.entriesCount }} 段内容</span>
          <span>{{ story.participants.length }} 人参与</span>
          <span>{{ formatDate(story.lastUpdated) }}</span>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <h3>创作新故事</h3>
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label>您的昵称</label>
            <input v-model="form.author" type="text" placeholder="请输入昵称" required />
          </div>
          <div class="form-group">
            <label>故事标题</label>
            <input v-model="form.title" type="text" placeholder="请输入故事标题" required />
          </div>
          <div class="form-group">
            <label>开篇内容</label>
            <textarea
              v-model="form.content"
              placeholder="写下故事的开头..."
              rows="4"
              required
            ></textarea>
            <div class="char-count">{{ form.content.length }} / {{ maxChars }}</div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">取消</button>
            <button type="submit" class="btn btn-primary">发布</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="message" class="toast" :class="{ error: messageType === 'error' }">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const stories = ref([]);
const showCreateModal = ref(false);
const message = ref('');
const messageType = ref('success');
const maxChars = ref(500);

const form = ref({
  author: '',
  title: '',
  content: ''
});

async function fetchStories() {
  try {
    const res = await fetch('/api/stories');
    stories.value = await res.json();
  } catch (err) {
    console.error(err);
  }
}

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    maxChars.value = data.maxCharsPerStory;
  } catch (err) {
    console.error(err);
  }
}

async function handleCreate() {
  if (form.value.content.length > maxChars.value) {
    showMessage(`开篇内容不能超过 ${maxChars.value} 字`, 'error');
    return;
  }
  try {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('故事创建成功！');
      showCreateModal.value = false;
      form.value = { author: '', title: '', content: '' };
      fetchStories();
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('创建失败，请重试', 'error');
  }
}

function showMessage(msg, type = 'success') {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => { message.value = ''; }, 3000);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN');
}

onMounted(() => {
  fetchStories();
  fetchConfig();
});
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.section-header h2 {
  font-size: 1.5rem;
  color: #333;
}
.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102,126,234,0.4);
}
.btn-secondary {
  background: #e0e0e0;
  color: #333;
}
.btn-secondary:hover {
  background: #d0d0d0;
}
.empty {
  text-align: center;
  padding: 3rem;
  color: #999;
}
.story-cards {
  display: grid;
  gap: 1rem;
}
.story-card {
  background: white;
  border-radius: 12px;
  padding: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #eee;
}
.story-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.card-header h3 {
  font-size: 1.1rem;
  color: #333;
  margin: 0;
}
.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}
.badge-locked {
  background: #ffd700;
  color: #8b6914;
}
.card-meta {
  display: flex;
  gap: 1rem;
  color: #888;
  font-size: 0.85rem;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  margin: 1rem;
}
.modal h3 {
  margin-bottom: 1rem;
  color: #333;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.3rem;
  color: #555;
  font-size: 0.9rem;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}
.char-count {
  text-align: right;
  font-size: 0.8rem;
  color: #999;
  margin-top: 0.2rem;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  background: #4caf50;
  color: white;
  border-radius: 8px;
  z-index: 2000;
  animation: slideIn 0.3s ease;
}
.toast.error {
  background: #f44336;
}
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
</style>
