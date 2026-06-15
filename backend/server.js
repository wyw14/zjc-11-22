import express from 'express';
import cors from 'cors';
import {
  createStory,
  getAllStories,
  getStoryById,
  addEntry,
  resetStory,
  MAX_PARTICIPANTS,
  MAX_CHARS_PER_STORY,
  createCompletionSuggestion,
  getCompletionSuggestions,
  reviewCompletionSuggestion,
  lockStory,
  unlockStory
} from './storage.js';

const app = express();
const PORT = process.env.PORT || 4021;
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/config', (_req, res) => {
  res.json({
    maxParticipants: MAX_PARTICIPANTS,
    maxCharsPerStory: MAX_CHARS_PER_STORY
  });
});

app.get('/api/stories', (_req, res) => {
  try {
    const stories = getAllStories();
    res.json(stories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取故事列表失败' });
  }
});

app.get('/api/stories/:id', (req, res) => {
  try {
    const story = getStoryById(req.params.id);
    if (!story) {
      return res.status(404).json({ error: '故事不存在' });
    }
    res.json(story);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取故事详情失败' });
  }
});

app.post('/api/stories', (req, res) => {
  try {
    const { title, content, author } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: '故事标题不能为空' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '开篇内容不能为空' });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ error: '作者名称不能为空' });
    }
    if (content.length > MAX_CHARS_PER_STORY) {
      return res.status(400).json({ error: `开篇内容不能超过 ${MAX_CHARS_PER_STORY} 字` });
    }
    const story = createStory({
      title: title.trim(),
      content: content.trim(),
      author: author.trim()
    });
    res.status(201).json(story);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建故事失败' });
  }
});

app.post('/api/stories/:id/entries', (req, res) => {
  try {
    const { content, author } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: '续写内容不能为空' });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ error: '作者名称不能为空' });
    }
    const result = addEntry(req.params.id, {
      content: content.trim(),
      author: author.trim()
    });
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json(result.story);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '提交续写失败' });
  }
});

app.post('/api/admin/stories/:id/reset', (req, res) => {
  try {
    const result = resetStory(req.params.id);
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json({
      message: '故事已重置',
      story: result.story
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '重置故事失败' });
  }
});

app.post('/api/stories/:id/completion-suggestions', (req, res) => {
  try {
    const { reason, author } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: '完结理由不能为空' });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ error: '提交者名称不能为空' });
    }
    const result = createCompletionSuggestion({
      storyId: req.params.id,
      reason: reason.trim(),
      author: author.trim()
    });
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.status(201).json({
      message: '完结建议已提交',
      suggestion: result.suggestion
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '提交完结建议失败' });
  }
});

app.get('/api/admin/completion-suggestions', (req, res) => {
  try {
    const { status } = req.query;
    const suggestions = getCompletionSuggestions({ status });
    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取完结建议列表失败' });
  }
});

app.post('/api/admin/completion-suggestions/:id/review', (req, res) => {
  try {
    const { action, reviewNote, reviewedBy } = req.body || {};
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效的审核操作' });
    }
    if (!reviewedBy || !reviewedBy.trim()) {
      return res.status(400).json({ error: '审核人不能为空' });
    }
    const result = reviewCompletionSuggestion(req.params.id, {
      action,
      reviewNote: reviewNote?.trim() || null,
      reviewedBy: reviewedBy.trim()
    });
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json({
      message: action === 'approve' ? '已批准完结建议，故事已锁定' : '已拒绝完结建议',
      suggestion: result.suggestion,
      story: result.story
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '审核完结建议失败' });
  }
});

app.post('/api/admin/stories/:id/lock', (req, res) => {
  try {
    const result = lockStory(req.params.id);
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json({
      message: '故事已锁定',
      story: result.story
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '锁定故事失败' });
  }
});

app.post('/api/admin/stories/:id/unlock', (req, res) => {
  try {
    const result = unlockStory(req.params.id);
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json({
      message: '故事已解锁',
      story: result.story
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '解锁故事失败' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`微小说接力服务已启动: http://localhost:${PORT}`);
});
