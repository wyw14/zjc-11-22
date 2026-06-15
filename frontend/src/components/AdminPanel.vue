<template>
  <div class="admin-panel">
    <div class="section-header">
      <h2>管理中心</h2>
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'suggestions' }"
          @click="activeTab = 'suggestions'"
        >
          完结建议
          <span v-if="pendingCount > 0" class="badge-count">{{ pendingCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'stories' }"
          @click="activeTab = 'stories'"
        >
          故事管理
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'suggestions'" class="tab-content">
      <div class="filter-bar">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="filter-btn"
          :class="{ active: currentFilter === filter.value }"
          @click="currentFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <div v-if="filteredSuggestions.length === 0" class="empty">
        <p>暂无{{ filterLabel }}的完结建议</p>
      </div>

      <div class="suggestion-list">
        <div
          v-for="suggestion in filteredSuggestions"
          :key="suggestion.id"
          class="suggestion-card"
          :class="{ 'card-pending': suggestion.status === 'pending' }"
        >
          <div class="card-header">
            <div class="card-title">
              <h3>{{ suggestion.storyTitle }}</h3>
              <span
                class="badge"
                :class="{
                  'badge-pending': suggestion.status === 'pending',
                  'badge-approved': suggestion.status === 'approved',
                  'badge-rejected': suggestion.status === 'rejected'
                }"
              >
                {{ statusText[suggestion.status] }}
              </span>
            </div>
            <div class="card-date">{{ formatDate(suggestion.createdAt) }}</div>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="label">提交者：</span>
              <span>{{ suggestion.author }}</span>
            </div>
            <div class="info-row">
              <span class="label">完结理由：</span>
            </div>
            <div class="reason-box">{{ suggestion.reason }}</div>

            <div v-if="suggestion.status !== 'pending'" class="review-info">
              <div class="info-row">
                <span class="label">审核人：</span>
                <span>{{ suggestion.reviewedBy }}</span>
              </div>
              <div class="info-row">
                <span class="label">审核时间：</span>
                <span>{{ formatDate(suggestion.reviewedAt) }}</span>
              </div>
              <div v-if="suggestion.reviewNote" class="info-row">
                <span class="label">审核备注：</span>
              </div>
              <div v-if="suggestion.reviewNote" class="review-note">{{ suggestion.reviewNote }}</div>
            </div>
          </div>

          <div v-if="suggestion.status === 'pending'" class="card-actions">
            <button
              class="btn btn-danger"
              @click="openReviewModal(suggestion, 'reject')"
            >
              拒绝建议
            </button>
            <button
              class="btn btn-success"
              @click="openReviewModal(suggestion, 'approve')"
            >
              批准并锁定
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'stories'" class="tab-content">
      <div v-if="stories.length === 0" class="empty">
        <p>暂无故事</p>
      </div>

      <div class="story-list-admin">
        <div
          v-for="story in stories"
          :key="story.id"
          class="story-item"
        >
          <div class="story-info">
            <div class="story-title">
              <h4>{{ story.title }}</h4>
              <span v-if="story.isLocked" class="badge badge-locked">已锁定</span>
            </div>
            <div class="story-meta">
              <span>{{ story.entriesCount }} 段</span>
              <span>{{ story.participants.length }} 人参与</span>
              <span>{{ formatDate(story.lastUpdated) }}</span>
            </div>
          </div>
          <div class="story-actions">
            <button
              v-if="!story.isLocked"
              class="btn btn-warning btn-sm"
              @click="handleLock(story.id)"
            >
              锁定
            </button>
            <button
              v-else
              class="btn btn-secondary btn-sm"
              @click="handleUnlock(story.id)"
            >
              解锁
            </button>
            <button
              class="btn btn-secondary btn-sm"
              @click="handleReset(story.id)"
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReviewModal" class="modal-overlay" @click.self="showReviewModal = false">
      <div class="modal">
        <h3>{{ reviewAction === 'approve' ? '批准完结建议' : '拒绝完结建议' }}</h3>
        <p v-if="reviewAction === 'approve'" class="modal-desc">
          批准后，该故事将被锁定，无法继续续写。
        </p>
        <form @submit.prevent="handleReview">
          <div class="form-group">
            <label>审核人</label>
            <input v-model="reviewForm.reviewedBy" type="text" placeholder="请输入您的名称" required />
          </div>
          <div class="form-group">
            <label>审核备注（可选）</label>
            <textarea
              v-model="reviewForm.reviewNote"
              placeholder="填写审核意见..."
              rows="3"
            ></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showReviewModal = false">取消</button>
            <button
              type="submit"
              class="btn"
              :class="reviewAction === 'approve' ? 'btn-success' : 'btn-danger'"
            >
              确认{{ reviewAction === 'approve' ? '批准' : '拒绝' }}
            </button>
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
import { ref, computed, onMounted } from 'vue';

const activeTab = ref('suggestions');
const currentFilter = ref('pending');
const suggestions = ref([]);
const stories = ref([]);
const showReviewModal = ref(false);
const reviewAction = ref('');
const selectedSuggestion = ref(null);
const message = ref('');
const messageType = ref('success');

const reviewForm = ref({
  reviewedBy: '',
  reviewNote: ''
});

const statusText = {
  pending: '待审核',
  approved: '已批准',
  rejected: '已拒绝'
};

const filters = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已批准', value: 'approved' },
  { label: '已拒绝', value: 'rejected' }
];

const pendingCount = computed(() =>
  suggestions.value.filter(s => s.status === 'pending').length
);

const filterLabel = computed(() => {
  const f = filters.find(f => f.value === currentFilter.value);
  return f ? f.label : '';
});

const filteredSuggestions = computed(() => {
  if (currentFilter.value === 'all') {
    return suggestions.value;
  }
  return suggestions.value.filter(s => s.status === currentFilter.value);
});

async function fetchSuggestions() {
  try {
    const res = await fetch('/api/admin/completion-suggestions');
    suggestions.value = await res.json();
  } catch (err) {
    showMessage('加载完结建议失败', 'error');
  }
}

async function fetchStories() {
  try {
    const res = await fetch('/api/stories');
    stories.value = await res.json();
  } catch (err) {
    showMessage('加载故事列表失败', 'error');
  }
}

function openReviewModal(suggestion, action) {
  selectedSuggestion.value = suggestion;
  reviewAction.value = action;
  reviewForm.value = { reviewedBy: '', reviewNote: '' };
  showReviewModal.value = true;
}

async function handleReview() {
  if (!selectedSuggestion.value) return;
  try {
    const res = await fetch(`/api/admin/completion-suggestions/${selectedSuggestion.value.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: reviewAction.value,
        reviewNote: reviewForm.value.reviewNote,
        reviewedBy: reviewForm.value.reviewedBy
      })
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      showReviewModal.value = false;
      fetchSuggestions();
      fetchStories();
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('审核失败，请重试', 'error');
  }
}

async function handleLock(storyId) {
  if (!confirm('确定要锁定这个故事吗？锁定后将无法继续续写。')) return;
  try {
    const res = await fetch(`/api/admin/stories/${storyId}/lock`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchStories();
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('锁定失败，请重试', 'error');
  }
}

async function handleUnlock(storyId) {
  if (!confirm('确定要解锁这个故事吗？')) return;
  try {
    const res = await fetch(`/api/admin/stories/${storyId}/unlock`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchStories();
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('解锁失败，请重试', 'error');
  }
}

async function handleReset(storyId) {
  if (!confirm('确定要重置这个故事吗？这将删除所有续写内容，只保留开篇。')) return;
  try {
    const res = await fetch(`/api/admin/stories/${storyId}/reset`, {
      method: 'POST'
    });
    const data = await res.json();
    if (res.ok) {
      showMessage(data.message);
      fetchStories();
    } else {
      showMessage(data.error, 'error');
    }
  } catch (err) {
    showMessage('重置失败，请重试', 'error');
  }
}

function showMessage(msg, type = 'success') {
  message.value = msg;
  messageType.value = type;
  setTimeout(() => { message.value = ''; }, 3000);
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  fetchSuggestions();
  fetchStories();
});
</script>

<style scoped>
.section-header {
  margin-bottom: 1.5rem;
}
.section-header h2 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1rem;
}
.tabs {
  display: flex;
  gap: 0.5rem;
}
.tab-btn {
  padding: 0.6rem 1.2rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.tab-btn.active {
  border-color: #667eea;
  background: #f0f4ff;
  color: #667eea;
}
.badge-count {
  background: #ff5e62;
  color: white;
  border-radius: 12px;
  padding: 0.1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.filter-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.filter-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}
.empty {
  text-align: center;
  padding: 3rem;
  color: #999;
  background: white;
  border-radius: 12px;
}
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.suggestion-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #eee;
  overflow: hidden;
}
.card-pending {
  border-left: 4px solid #ff9800;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #f0f0f0;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}
.card-title h3 {
  font-size: 1.1rem;
  color: #333;
  margin: 0;
}
.card-date {
  font-size: 0.85rem;
  color: #999;
}
.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}
.badge-pending {
  background: #fff3e0;
  color: #e65100;
}
.badge-approved {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-rejected {
  background: #ffebee;
  color: #c62828;
}
.badge-locked {
  background: #ffd700;
  color: #8b6914;
}
.card-body {
  padding: 1rem 1.2rem;
}
.info-row {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}
.info-row .label {
  color: #999;
}
.reason-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 0.8rem;
  margin-bottom: 0.8rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #333;
}
.review-info {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0.8rem;
  margin-top: 0.8rem;
}
.review-note {
  background: white;
  border-radius: 6px;
  padding: 0.6rem;
  font-size: 0.9rem;
  color: #555;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.2rem;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}
.btn-primary {
  background: #667eea;
  color: white;
}
.btn-success {
  background: #4caf50;
  color: white;
}
.btn-success:hover {
  background: #43a047;
}
.btn-danger {
  background: #f44336;
  color: white;
}
.btn-danger:hover {
  background: #e53935;
}
.btn-warning {
  background: #ff9800;
  color: white;
}
.btn-warning:hover {
  background: #fb8c00;
}
.btn-secondary {
  background: #9e9e9e;
  color: white;
}
.btn-secondary:hover {
  background: #757575;
}
.story-list-admin {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.story-item {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #eee;
}
.story-title {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.3rem;
}
.story-title h4 {
  font-size: 1rem;
  color: #333;
  margin: 0;
}
.story-meta {
  display: flex;
  gap: 1rem;
  color: #888;
  font-size: 0.85rem;
}
.story-actions {
  display: flex;
  gap: 0.5rem;
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
  max-width: 450px;
  margin: 1rem;
}
.modal h3 {
  margin-bottom: 0.5rem;
  color: #333;
}
.modal-desc {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
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
