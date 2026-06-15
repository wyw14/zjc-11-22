<template>
  <div class="story-detail">
    <button class="btn-back" @click="$router.push('/')">← 返回列表</button>

    <div v-if="!story" class="loading">加载中...</div>

    <div v-else>
      <div class="story-header">
        <h2>{{ story.title }}</h2>
        <div class="header-meta">
          <span v-if="story.isLocked" class="badge badge-locked">🔒 已锁定</span>
          <span>{{ story.entries.length }} 段内容</span>
          <span>{{ story.participants.length }} 人参与</span>
        </div>
      </div>

      <div class="entries">
        <div
          v-for="(entry, index) in story.entries"
          :key="entry.id"
          class="entry"
          :class="{ 'entry-even': index % 2 === 1 }"
        >
          <div class="entry-content">{{ entry.content }}</div>
          <div class="entry-meta">
            <span class="entry-author">{{ entry.author }}</span>
            <span class="entry-date">{{ formatDate(entry.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div v-if="!story.isLocked" class="action-section">
        <div class="tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'continue' }"
            @click="activeTab = 'continue'"
          >
            ✍️ 续写故事
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'complete' }"
            @click="activeTab = 'complete'"
          >
            🎯 建议完结
          </button>
        </div>

        <div v-if="activeTab === 'continue'" class="tab-content">
          <form @submit.prevent="handleAddEntry">
            <div class="form-group">
              <label>您的昵称</label>
              <input v-model="entryForm.author" type="text" placeholder="请输入昵称" required />
            </div>
            <div class="form-group">
              <label>续写内容</label>
              <textarea
                v-model="entryForm.content"
                placeholder="继续这个故事..."
                rows="4"
                required
              ></textarea>
              <div class="char-count">
                总字数: {{ totalLength }} / {{ maxChars }}
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">提交续写</button>
          </form>
        </div>

        <div v-if="activeTab === 'complete'" class="tab-content">
          <div class="complete-intro">
            <h4>💡 为什么建议完结？</h4>
            <p>如果您觉得这个故事已经很完整，可以提交完结建议。管理员会查看您的理由并决定是否锁定故事。</p>
          </div>
          <form @submit.prevent="handleSubmitSuggestion">
            <div class="form-group">
              <label>您的昵称</label>
              <input v-model="suggestionForm.author" type="text" placeholder="请输入昵称" required />
            </div>
            <div class="form-group">
              <label>完结理由</label>
              <textarea
                v-model="suggestionForm.reason"
                placeholder="请详细说明为什么认为这个故事应该完结..."
                rows="4"
                required
              ></textarea>
              <div class="char-count">{{ suggestionForm.reason.length }} / 500</div>
            </div>
            <button type="submit" class="btn btn-warning btn-block">提交完结建议</button>
          </form>
        </div>
      </div>

      <div v-else class="locked-notice">
        <div class="lock-icon">🔒</div>
        <h3>故事已完结</h3>
        <p>这个故事已经被锁定，感谢所有参与者的精彩创作！</p>
      </div>
    </div>

    <div v-if="message" class="toast" :class="{ error: messageType === 'error' }">
      {{ message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const story = ref(null);
const activeTab = ref('continue');
const message = ref('');
const messageType = ref('success');
const maxChars = ref(500);
const maxParticipants = ref(5);

const entryForm = ref({
  author: '',
  content: ''
});

const suggestionForm = ref({
  author: '',
  reason: ''
});

const totalLength = computed(() => {
  if (!story.value) return 0;
  return story.value.entries.reduce((sum, e) => sum + e.content.length, 0) + entryForm.value.content.length;
});

async function fetchStory() {
  try {
    const res = await fetch(`/api/stories/${route.params.id}`);
    if (res.ok) {
      story.value = await res.json();
    } else {
      showMessage('故事不存在', 'error');
    }
  } catch (err) {
    showMessage('加载失败，请重试', 'error');
  }
}

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    maxChars.value = data.maxCharsPerStory;
    maxParticipants.value = data.maxParticipants;
  } catch (err) {
    console.error(err);
  }
}

async function handleAddEntry() {
  if (totalLength.value > maxChars.value) {
    showMessage(`故事总字数不能超过 ${maxChars.value} 字`, 'error');
    return;
  }
  try {
    const res = await fetch(`/api/stories/${route.params.id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryForm.value)
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('续写成功！');
      entryForm.value.content = '';
      fetchStory();
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('提交失败，请重试', 'error');
  }
}

async function handleSubmitSuggestion() {
  if (suggestionForm.value.reason.length > 500) {
    showMessage('理由不能超过 500 字', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/stories/${route.params.id}/completion-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestionForm.value)
    });
    const data = await res.json();
    if (res.ok) {
      showMessage('完结建议已提交，等待管理员审核！');
      suggestionForm.value = { author: '', reason: '' };
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('提交失败，请重试', 'error');
  }
}

function showMessage(msg, type = 'success') {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => { message.value = ''; }, 3000);
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  fetchStory();
  fetchConfig();
});
</script>

<style scoped>
.story-detail {
  max-width: 700px;
  margin: 0 auto;
}
.btn-back {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}
.btn-back:hover {
  text-decoration: underline;
}
.loading {
  text-align: center;
  padding: 3rem;
  color: #999;
}
.story-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  text-align: center;
}
.story-header h2 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 0.5rem;
}
.header-meta {
  display: flex;
  gap: 1rem;
  justify-content: center;
  color: #888;
  font-size: 0.9rem;
  flex-wrap: wrap;
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
.entries {
  margin-bottom: 1.5rem;
}
.entry {
  background: white;
  border-radius: 12px;
  padding: 1.2rem;
  margin-bottom: 0.8rem;
  border-left: 4px solid #667eea;
}
.entry-even {
  border-left-color: #764ba2;
}
.entry-content {
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
  margin-bottom: 0.5rem;
}
.entry-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #999;
}
.entry-author {
  font-weight: 500;
  color: #667eea;
}
.action-section {
  background: white;
  border-radius: 12px;
  padding: 1rem;
}
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.tab-btn {
  flex: 1;
  padding: 0.8rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}
.tab-btn.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.complete-intro {
  background: #fff8e1;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.complete-intro h4 {
  color: #8b6914;
  margin-bottom: 0.3rem;
}
.complete-intro p {
  color: #6b5010;
  font-size: 0.9rem;
  margin: 0;
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
.btn-warning {
  background: linear-gradient(135deg, #ff9966 0%, #ff5e62 100%);
  color: white;
}
.btn-warning:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255,94,98,0.4);
}
.btn-block {
  width: 100%;
}
.locked-notice {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}
.lock-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
.locked-notice h3 {
  color: #333;
  margin-bottom: 0.5rem;
}
.locked-notice p {
  color: #888;
  margin: 0;
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
