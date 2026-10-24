const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3005;

// Load fallback quotes
const fallbackQuotesPath = path.join(__dirname, 'data', 'fallback_quotes.json');
let fallbackQuotes = [];
try {
  const fileData = fs.readFileSync(fallbackQuotesPath, 'utf8');
  fallbackQuotes = JSON.parse(fileData);
  console.log(`Loaded ${fallbackQuotes.length} fallback quotes successfully.`);
} catch (err) {
  console.error('Error loading fallback quotes:', err.message);
  fallbackQuotes = [
    { id: 1, text: "Sample quotation 1 for API fallback testing.", author: "Sample Author 14", topic: "Learning" }
  ];
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Helper to get a random item from array
 */
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper: map topic to fallback if category requested
 */
function getFallbackQuote(topic = null) {
  let pool = fallbackQuotes;
  if (topic && topic.toLowerCase() !== 'all') {
    const filtered = fallbackQuotes.filter(q => q.topic.toLowerCase() === topic.toLowerCase());
    if (filtered.length > 0) pool = filtered;
  }
  const picked = getRandomItem(pool);
  return {
    id: `fb-${picked.id}`,
    text: picked.text,
    author: picked.author,
    topic: picked.topic,
    source: 'fallback'
  };
}

/**
 * Fetch quote from public external APIs with fast timeout & graceful fallback
 */
async function fetchExternalQuote(requestedTopic = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);

  // Candidate external APIs
  const apiUrls = [
    {
      url: 'https://dummyjson.com/quotes/random',
      parser: (data) => ({
        id: `dj-${data.id}`,
        text: data.quote,
        author: data.author,
        topic: requestedTopic && requestedTopic !== 'all' ? requestedTopic : 'Inspiration',
        source: 'api'
      })
    },
    {
      url: 'https://zenquotes.io/api/random',
      parser: (data) => {
        const item = Array.isArray(data) ? data[0] : data;
        return {
          id: `zq-${Date.now()}`,
          text: item.q,
          author: item.a,
          topic: requestedTopic && requestedTopic !== 'all' ? requestedTopic : 'Wisdom',
          source: 'api'
        };
      }
    }
  ];

  for (const target of apiUrls) {
    try {
      const response = await fetch(target.url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const parsed = target.parser(data);
        if (parsed.text && parsed.author) {
          return parsed;
        }
      }
    } catch (err) {
      // Continue to next API or fallback
    }
  }

  clearTimeout(timeoutId);
  // If all external APIs fail or timeout, fall back to synthetic dataset
  return getFallbackQuote(requestedTopic);
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * GET /api/quote/random
 * Query params:
 *   - topic: 'all' | 'Learning' | 'Work' | 'Creativity'
 *   - forceFallback: 'true' | 'false' (useful for testing fallback mechanism)
 */
app.get('/api/quote/random', async (req, res) => {
  const topic = req.query.topic || 'all';
  const forceFallback = req.query.forceFallback === 'true';

  let quote;
  let sourceMode = 'api';

  if (forceFallback) {
    quote = getFallbackQuote(topic);
    sourceMode = 'fallback';
  } else {
    try {
      quote = await fetchExternalQuote(topic);
      sourceMode = quote.source;
    } catch (err) {
      quote = getFallbackQuote(topic);
      sourceMode = 'fallback';
    }
  }

  // Record to history table
  try {
    db.addToHistory({
      quote_id: quote.id,
      text: quote.text,
      author: quote.author,
      topic: quote.topic,
      source: sourceMode
    });
  } catch (err) {
    console.error('Failed to log history:', err.message);
  }

  const isFav = db.isFavorite(quote.text, quote.author);
  const existingFav = isFav ? db.getFavoriteByText(quote.text, quote.author) : null;

  res.json({
    success: true,
    source: sourceMode,
    isFallback: sourceMode === 'fallback',
    quote,
    isFavorite: isFav,
    favoriteId: existingFav ? existingFav.id : null
  });
});

/**
 * GET /api/quote/daily
 * Computes deterministic daily quote for today
 */
app.get('/api/quote/daily', (req, res) => {
  const today = new Date();
  const dayIndex = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const picked = fallbackQuotes[dayIndex % fallbackQuotes.length];

  const dailyQuote = {
    id: `daily-${picked.id}`,
    text: picked.text,
    author: picked.author,
    topic: picked.topic,
    source: 'daily',
    date: today.toISOString().split('T')[0]
  };

  // Add to history
  db.addToHistory({
    quote_id: dailyQuote.id,
    text: dailyQuote.text,
    author: dailyQuote.author,
    topic: dailyQuote.topic,
    source: 'daily'
  });

  const isFav = db.isFavorite(dailyQuote.text, dailyQuote.author);
  const existingFav = isFav ? db.getFavoriteByText(dailyQuote.text, dailyQuote.author) : null;

  res.json({
    success: true,
    source: 'daily',
    quote: dailyQuote,
    isFavorite: isFav,
    favoriteId: existingFav ? existingFav.id : null
  });
});

/**
 * GET /api/quotes/fallback
 * Returns all 80 synthetic fallback records
 */
app.get('/api/quotes/fallback', (req, res) => {
  const topic = req.query.topic;
  let result = fallbackQuotes;
  if (topic && topic.toLowerCase() !== 'all') {
    result = fallbackQuotes.filter(q => q.topic.toLowerCase() === topic.toLowerCase());
  }
  res.json({
    success: true,
    total: result.length,
    quotes: result
  });
});

/**
 * GET /api/favorites
 * Query params:
 *   - topic: filter by topic
 *   - search: filter by keyword in text or author
 *   - sort: 'newest' | 'oldest' | 'author'
 */
app.get('/api/favorites', (req, res) => {
  const { topic, search, sort } = req.query;
  try {
    const favorites = db.getFavorites({ topic, search, sort });
    res.json({
      success: true,
      count: favorites.length,
      favorites
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/favorites
 * Body: { text, author, topic, quote_id, source }
 */
app.post('/api/favorites', (req, res) => {
  const { text, author, topic, quote_id, source } = req.body;
  if (!text || !author) {
    return res.status(400).json({ success: false, error: 'text and author are required' });
  }

  try {
    const result = db.addFavorite({ text, author, topic, quote_id, source });
    res.status(result.isNew ? 201 : 200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/favorites/toggle
 * Toggle favorite state for a quote
 */
app.post('/api/favorites/toggle', (req, res) => {
  const { text, author, topic, quote_id, source } = req.body;
  if (!text || !author) {
    return res.status(400).json({ success: false, error: 'text and author are required' });
  }

  try {
    const isFav = db.isFavorite(text, author);
    if (isFav) {
      db.removeFavoriteByText(text, author);
      res.json({ success: true, isFavorite: false, message: 'Removed from favorites' });
    } else {
      const added = db.addFavorite({ text, author, topic, quote_id, source });
      res.json({ success: true, isFavorite: true, favorite: added.favorite, message: 'Saved to favorites' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/favorites/:id
 */
app.delete('/api/favorites/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.removeFavorite(id);
    if (result.success) {
      res.json({ success: true, message: 'Favorite deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Favorite not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/history
 * Query params:
 *   - search
 *   - topic
 *   - limit
 */
app.get('/api/history', (req, res) => {
  const { search, topic, limit } = req.query;
  try {
    const history = db.getHistory({ search, topic, limit });
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/history/clear
 */
app.delete('/api/history/clear', (req, res) => {
  try {
    db.clearHistory();
    res.json({ success: true, message: 'History cleared successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Fallback route for SPA
 */
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`✨ Quote Generator Server running at http://localhost:${PORT}`);
  console.log(`📚 Database: SQLite persistent storage enabled.`);
  console.log(`🛡️ Fallback: 80 synthetic local quotes loaded.`);
});
