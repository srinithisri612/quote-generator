const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'quotes.db');
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id TEXT,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    topic TEXT DEFAULT 'General',
    source TEXT DEFAULT 'api',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id TEXT,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    topic TEXT DEFAULT 'General',
    source TEXT DEFAULT 'api',
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_favorites_text_author ON favorites(text, author);
  CREATE INDEX IF NOT EXISTS idx_history_viewed_at ON history(viewed_at DESC);
`);

/**
 * Check if a quote is favorited
 */
function isFavorite(text, author) {
  const stmt = db.prepare('SELECT id FROM favorites WHERE text = ? AND author = ? LIMIT 1');
  const result = stmt.get(text.trim(), author.trim());
  return !!result;
}

/**
 * Get favorite by text and author
 */
function getFavoriteByText(text, author) {
  const stmt = db.prepare('SELECT * FROM favorites WHERE text = ? AND author = ? LIMIT 1');
  return stmt.get(text.trim(), author.trim()) || null;
}

/**
 * Add a quote to favorites
 */
function addFavorite({ quote_id = '', text, author, topic = 'General', source = 'api' }) {
  const cleanText = text ? text.trim() : '';
  const cleanAuthor = author ? author.trim() : 'Unknown';
  const cleanTopic = topic ? topic.trim() : 'General';

  const existing = getFavoriteByText(cleanText, cleanAuthor);
  if (existing) {
    return { success: true, message: 'Already favorited', favorite: existing, isNew: false };
  }

  const insertStmt = db.prepare(`
    INSERT INTO favorites (quote_id, text, author, topic, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(String(quote_id || ''), cleanText, cleanAuthor, cleanTopic, source);
  const newFav = db.prepare('SELECT * FROM favorites WHERE id = ?').get(result.lastInsertRowid);

  return { success: true, message: 'Quote added to favorites', favorite: newFav, isNew: true };
}

/**
 * Remove a quote from favorites by ID
 */
function removeFavorite(id) {
  const stmt = db.prepare('DELETE FROM favorites WHERE id = ?');
  const result = stmt.run(Number(id));
  return { success: result.changes > 0 };
}

/**
 * Remove a quote from favorites by text & author
 */
function removeFavoriteByText(text, author) {
  const stmt = db.prepare('DELETE FROM favorites WHERE text = ? AND author = ?');
  const result = stmt.run(text.trim(), author.trim());
  return { success: result.changes > 0 };
}

/**
 * Retrieve favorites with filtering and sorting
 */
function getFavorites({ search = '', topic = 'all', sort = 'newest' } = {}) {
  let query = 'SELECT * FROM favorites WHERE 1=1';
  const params = [];

  if (topic && topic.toLowerCase() !== 'all') {
    query += ' AND LOWER(topic) = LOWER(?)';
    params.push(topic.trim());
  }

  if (search && search.trim() !== '') {
    query += ' AND (text LIKE ? OR author LIKE ?)';
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern);
  }

  if (sort === 'oldest') {
    query += ' ORDER BY created_at ASC';
  } else if (sort === 'author') {
    query += ' ORDER BY author ASC, created_at DESC';
  } else {
    // Default newest
    query += ' ORDER BY id DESC';
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Add quote to history
 */
function addToHistory({ quote_id = '', text, author, topic = 'General', source = 'api' }) {
  if (!text) return null;
  const cleanText = text.trim();
  const cleanAuthor = author ? author.trim() : 'Unknown';
  const cleanTopic = topic ? topic.trim() : 'General';

  const insertStmt = db.prepare(`
    INSERT INTO history (quote_id, text, author, topic, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertStmt.run(String(quote_id || ''), cleanText, cleanAuthor, cleanTopic, source);

  // Keep history table under reasonable limit (max 200 items)
  db.exec(`
    DELETE FROM history WHERE id NOT IN (
      SELECT id FROM history ORDER BY id DESC LIMIT 200
    )
  `);

  return db.prepare('SELECT * FROM history WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Retrieve history with filtering
 */
function getHistory({ search = '', topic = 'all', limit = 50 } = {}) {
  let query = 'SELECT * FROM history WHERE 1=1';
  const params = [];

  if (topic && topic.toLowerCase() !== 'all') {
    query += ' AND LOWER(topic) = LOWER(?)';
    params.push(topic.trim());
  }

  if (search && search.trim() !== '') {
    query += ' AND (text LIKE ? OR author LIKE ?)';
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit) || 50);

  const stmt = db.prepare(query);
  const rows = stmt.all(...params);

  // Annotate whether each history item is currently favorited
  return rows.map(item => ({
    ...item,
    is_favorite: isFavorite(item.text, item.author)
  }));
}

/**
 * Clear history
 */
function clearHistory() {
  db.exec('DELETE FROM history');
  return { success: true };
}

/**
 * Retrieve statistics
 */
function getStats() {
  const totalFavorites = db.prepare('SELECT COUNT(*) as count FROM favorites').get().count;
  const totalHistory = db.prepare('SELECT COUNT(*) as count FROM history').get().count;
  const topicStats = db.prepare('SELECT topic, COUNT(*) as count FROM favorites GROUP BY topic').all();

  return {
    totalFavorites,
    totalHistory,
    topicStats
  };
}

module.exports = {
  db,
  isFavorite,
  getFavoriteByText,
  addFavorite,
  removeFavorite,
  removeFavoriteByText,
  getFavorites,
  addToHistory,
  getHistory,
  clearHistory,
  getStats
};
