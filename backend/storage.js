import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data.json');

export const MAX_PARTICIPANTS = 5;
export const MAX_CHARS_PER_STORY = 500;

let data = {
  stories: [],
  completionSuggestions: []
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      data = JSON.parse(content);
      if (!data.completionSuggestions) {
        data.completionSuggestions = [];
      }
      if (!data.stories) {
        data.stories = [];
      }
    }
  } catch (err) {
    console.error('加载数据失败:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('保存数据失败:', err);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

loadData();

export function createStory({ title, content, author }) {
  const story = {
    id: generateId(),
    title,
    entries: [{
      id: generateId(),
      content,
      author,
      createdAt: Date.now()
    }],
    createdAt: Date.now(),
    isLocked: false,
    participants: [author]
  };
  data.stories.unshift(story);
  saveData();
  return story;
}

export function getAllStories() {
  return data.stories.map(story => ({
    id: story.id,
    title: story.title,
    entriesCount: story.entries.length,
    lastUpdated: story.entries[story.entries.length - 1]?.createdAt || story.createdAt,
    isLocked: story.isLocked,
    participants: story.participants
  }));
}

export function getStoryById(id) {
  return data.stories.find(s => s.id === id);
}

export function addEntry(storyId, { content, author }) {
  const story = data.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: '故事不存在', code: 404 };
  }
  if (story.isLocked) {
    return { success: false, error: '故事已锁定，无法续写', code: 400 };
  }
  if (!story.participants.includes(author)) {
    if (story.participants.length >= MAX_PARTICIPANTS) {
      return { success: false, error: `参与人数已达上限 ${MAX_PARTICIPANTS} 人`, code: 400 };
    }
    story.participants.push(author);
  }
  const lastEntry = story.entries[story.entries.length - 1];
  if (lastEntry.author === author) {
    return { success: false, error: '不能连续续写', code: 400 };
  }
  const totalLength = story.entries.reduce((sum, e) => sum + e.content.length, 0) + content.length;
  if (totalLength > MAX_CHARS_PER_STORY) {
    return { success: false, error: `故事总字数不能超过 ${MAX_CHARS_PER_STORY} 字`, code: 400 };
  }
  story.entries.push({
    id: generateId(),
    content,
    author,
    createdAt: Date.now()
  });
  saveData();
  return { success: true, story };
}

export function resetStory(storyId) {
  const story = data.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: '故事不存在', code: 404 };
  }
  if (story.entries.length <= 1) {
    return { success: false, error: '故事只有开篇，无需重置', code: 400 };
  }
  const firstEntry = story.entries[0];
  story.entries = [firstEntry];
  story.participants = [firstEntry.author];
  story.isLocked = false;
  saveData();
  return { success: true, story };
}

export function createCompletionSuggestion({ storyId, reason, author }) {
  const story = data.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: '故事不存在', code: 404 };
  }
  if (story.isLocked) {
    return { success: false, error: '故事已锁定', code: 400 };
  }
  const existingSuggestion = data.completionSuggestions.find(
    s => s.storyId === storyId && s.author === author && s.status === 'pending'
  );
  if (existingSuggestion) {
    return { success: false, error: '您已提交过完结建议', code: 400 };
  }
  const suggestion = {
    id: generateId(),
    storyId,
    storyTitle: story.title,
    reason,
    author,
    status: 'pending',
    createdAt: Date.now(),
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null
  };
  data.completionSuggestions.unshift(suggestion);
  saveData();
  return { success: true, suggestion };
}

export function getCompletionSuggestions({ status } = {}) {
  let suggestions = [...data.completionSuggestions];
  if (status) {
    suggestions = suggestions.filter(s => s.status === status);
  }
  return suggestions;
}

export function reviewCompletionSuggestion(suggestionId, { action, reviewNote, reviewedBy }) {
  const suggestion = data.completionSuggestions.find(s => s.id === suggestionId);
  if (!suggestion) {
    return { success: false, error: '建议不存在', code: 404 };
  }
  if (suggestion.status !== 'pending') {
    return { success: false, error: '该建议已被审核', code: 400 };
  }
  const story = data.stories.find(s => s.id === suggestion.storyId);
  if (!story) {
    return { success: false, error: '关联故事不存在', code: 404 };
  }
  suggestion.reviewedAt = Date.now();
  suggestion.reviewedBy = reviewedBy;
  suggestion.reviewNote = reviewNote || null;
  if (action === 'approve') {
    suggestion.status = 'approved';
    story.isLocked = true;
    data.completionSuggestions.forEach(s => {
      if (s.id !== suggestion.id && s.storyId === suggestion.storyId && s.status === 'pending') {
        s.status = 'rejected';
        s.reviewedAt = Date.now();
        s.reviewedBy = reviewedBy;
        s.reviewNote = '故事已被其他建议锁定';
      }
    });
  } else if (action === 'reject') {
    suggestion.status = 'rejected';
  } else {
    return { success: false, error: '无效的操作', code: 400 };
  }
  saveData();
  return { success: true, suggestion, story };
}

export function lockStory(storyId) {
  const story = data.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: '故事不存在', code: 404 };
  }
  story.isLocked = true;
  saveData();
  return { success: true, story };
}

export function unlockStory(storyId) {
  const story = data.stories.find(s => s.id === storyId);
  if (!story) {
    return { success: false, error: '故事不存在', code: 404 };
  }
  story.isLocked = false;
  saveData();
  return { success: true, story };
}
