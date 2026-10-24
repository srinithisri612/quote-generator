/**
 * Inspirify - Main Frontend Logic
 * Connects UI with Express + SQLite Backend & Fallback System
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const state = {
    currentQuote: null,
    isFavorite: false,
    favoriteId: null,
    mode: 'random', // 'random' | 'daily'
    topic: 'all',
    forceFallback: false,
    activeVaultTab: 'favorites', // 'favorites' | 'history' | 'dataset'
    vaultSearch: '',
    vaultTopic: 'all',
    vaultSort: 'newest',
    favoritesList: [],
    historyList: [],
    datasetList: [],
    isSpeaking: false,
    theme: localStorage.getItem('inspirify-theme') || 'dark'
  };

  // ==========================================
  // DOM ELEMENT SELECTORS
  // ==========================================
  const el = {
    // Theme & Status
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    fallbackToggle: document.getElementById('fallbackToggle'),

    // Main Quote
    mainQuoteCard: document.getElementById('mainQuoteCard'),
    quoteText: document.getElementById('quoteText'),
    quoteAuthor: document.getElementById('quoteAuthor'),
    quoteTopicTag: document.getElementById('quoteTopicTag'),
    quoteSourceTag: document.getElementById('quoteSourceTag'),
    quoteIdDisplay: document.getElementById('quoteIdDisplay'),
    authorAvatar: document.getElementById('authorAvatar'),
    authorMetaLabel: document.getElementById('authorMetaLabel'),

    // Controls & Actions
    modeRandomBtn: document.getElementById('modeRandomBtn'),
    modeDailyBtn: document.getElementById('modeDailyBtn'),
    topicFilterBar: document.getElementById('topicFilterBar'),
    newQuoteBtn: document.getElementById('newQuoteBtn'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    favBtnLabel: document.getElementById('favBtnLabel'),
    copyBtn: document.getElementById('copyBtn'),
    copyBtnLabel: document.getElementById('copyBtnLabel'),
    speakBtn: document.getElementById('speakBtn'),
    exportImageBtn: document.getElementById('exportImageBtn'),
    shareTwitterBtn: document.getElementById('shareTwitterBtn'),
    shareWhatsAppBtn: document.getElementById('shareWhatsAppBtn'),

    // Alert Banner
    fallbackNoticeBanner: document.getElementById('fallbackNoticeBanner'),
    alertBannerTitle: document.getElementById('alertBannerTitle'),
    alertBannerMessage: document.getElementById('alertBannerMessage'),
    dismissAlertBtn: document.getElementById('dismissAlertBtn'),

    // Stats
    statFavoritesCount: document.getElementById('statFavoritesCount'),
    statHistoryCount: document.getElementById('statHistoryCount'),
    statFallbackCount: document.getElementById('statFallbackCount'),
    navFavoritesCount: document.getElementById('navFavoritesCount'),

    // Vault (Side Panel)
    vaultPanel: document.getElementById('vaultPanel'),
    drawerToggleBtn: document.getElementById('drawerToggleBtn'),
    closeVaultBtn: document.getElementById('closeVaultBtn'),
    tabFavorites: document.getElementById('tabFavorites'),
    tabHistory: document.getElementById('tabHistory'),
    tabFallbackPool: document.getElementById('tabFallbackPool'),
    favoritesBadge: document.getElementById('favoritesBadge'),
    historyBadge: document.getElementById('historyBadge'),
    vaultSearchInput: document.getElementById('vaultSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    vaultTopicSelect: document.getElementById('vaultTopicSelect'),
    vaultSortSelect: document.getElementById('vaultSortSelect'),
    vaultListContainer: document.getElementById('vaultListContainer'),
    favoritesUtilButtons: document.getElementById('favoritesUtilButtons'),
    historyUtilButtons: document.getElementById('historyUtilButtons'),
    exportJsonBtn: document.getElementById('exportJsonBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    applyTheme(state.theme);
    bindEvents();
    fetchNextQuote();
    refreshVault();
    refreshStats();
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('inspirify-theme', theme);
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'warn') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <span class="toast-message">${message}</span>
    `;

    el.toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ==========================================
  // API FETCH & QUOTE DISPLAY
  // ==========================================
  async function fetchNextQuote() {
    // Add spinning animation to refresh button icon
    const refreshIcon = el.newQuoteBtn.querySelector('.refresh-icon');
    if (refreshIcon) refreshIcon.classList.add('rotating');

    // Fade out text during transition
    el.quoteText.classList.add('text-fade');

    let endpoint = '/api/quote/random';
    const params = new URLSearchParams();

    if (state.mode === 'daily') {
      endpoint = '/api/quote/daily';
    } else {
      if (state.topic && state.topic !== 'all') {
        params.append('topic', state.topic);
      }
      if (state.forceFallback) {
        params.append('forceFallback', 'true');
      }
    }

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.quote) {
        setTimeout(() => {
          renderQuote(data.quote, data.isFavorite, data.isFallback, data.source);
          el.quoteText.classList.remove('text-fade');
          if (refreshIcon) refreshIcon.classList.remove('rotating');
        }, 150);

        // Update stats and history in background
        refreshStats();
        if (state.activeVaultTab === 'history') {
          loadHistoryList();
        }
      } else {
        throw new Error('Invalid quote response');
      }
    } catch (err) {
      console.warn('Network issue fetching quote, using local offline fallback:', err);
      // Fallback directly from client if backend offline
      displayLocalFallback();
      el.quoteText.classList.remove('text-fade');
      if (refreshIcon) refreshIcon.classList.remove('rotating');
    }
  }

  function renderQuote(quote, isFav = false, isFallback = false, source = 'api') {
    state.currentQuote = quote;
    state.isFavorite = isFav;

    // Quote text & author
    el.quoteText.textContent = `“${quote.text}”`;
    el.quoteAuthor.textContent = quote.author || 'Unknown';

    // Quote ID
    const displayId = String(quote.id || '').replace('fb-', '#').replace('dj-', '#').replace('zq-', '#');
    el.quoteIdDisplay.textContent = displayId ? `#${displayId.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}` : '#01';

    // Topic Pill & Styling
    const topic = quote.topic || 'General';
    el.quoteTopicTag.textContent = topic;
    el.quoteTopicTag.className = 'topic-pill';
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('learn')) {
      el.quoteTopicTag.classList.add('pill-learning');
    } else if (lowerTopic.includes('work')) {
      el.quoteTopicTag.classList.add('pill-work');
    } else if (lowerTopic.includes('creativ')) {
      el.quoteTopicTag.classList.add('pill-creativity');
    } else {
      el.quoteTopicTag.classList.add('pill-general');
    }

    // Source Tag
    if (source === 'daily') {
      el.quoteSourceTag.textContent = 'Daily Quote of the Day';
    } else if (isFallback || source === 'fallback') {
      el.quoteSourceTag.textContent = 'Synthetic Local Dataset';
    } else {
      el.quoteSourceTag.textContent = 'Live Public API';
    }

    // Author Avatar (Initials)
    const initials = (quote.author || 'Author')
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    el.authorAvatar.textContent = initials;
    el.authorMetaLabel.textContent = `Topic: ${topic} • Source: ${source.toUpperCase()}`;

    // Update Favorite Button State
    updateFavoriteBtnState(isFav);

    // Update Status Badge & Banner
    updateStatusIndicators(isFallback || source === 'fallback' || state.forceFallback);
  }

  function updateStatusIndicators(isFallback) {
    if (isFallback) {
      el.statusBadge.className = 'status-badge status-fallback';
      el.statusText.textContent = 'Fallback Mode';
      el.fallbackNoticeBanner.classList.remove('hidden');
      el.alertBannerTitle.textContent = 'Resilient Fallback Mode:';
      el.alertBannerMessage.textContent = 'Serving curated quotes from local 80-item synthetic repository (graceful API error handling).';
    } else {
      el.statusBadge.className = 'status-badge status-live';
      el.statusText.textContent = 'Live API';
      el.fallbackNoticeBanner.classList.add('hidden');
    }
  }

  function updateFavoriteBtnState(isFav) {
    if (isFav) {
      el.favoriteBtn.classList.add('active');
      el.favBtnLabel.textContent = 'Favorited';
      el.favoriteBtn.title = 'Remove from favorites';
    } else {
      el.favoriteBtn.classList.remove('active');
      el.favBtnLabel.textContent = 'Favorite';
      el.favoriteBtn.title = 'Save to favorites';
    }
  }

  // ==========================================
  // FAVORITES MANAGEMENT
  // ==========================================
  async function toggleFavorite() {
    if (!state.currentQuote) return;

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: state.currentQuote.text,
          author: state.currentQuote.author,
          topic: state.currentQuote.topic,
          quote_id: state.currentQuote.id,
          source: state.currentQuote.source || 'api'
        })
      });

      const data = await response.json();
      if (data.success) {
        state.isFavorite = data.isFavorite;
        updateFavoriteBtnState(data.isFavorite);

        if (data.isFavorite) {
          showToast('Added to your favorites vault!', 'success');
        } else {
          showToast('Removed from favorites', 'info');
        }

        refreshVault();
        refreshStats();
      }
    } catch (err) {
      showToast('Error updating favorite', 'warn');
    }
  }

  async function removeFavoriteById(id) {
    try {
      const response = await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        showToast('Favorite removed', 'info');
        // If current quote was this favorite, update button
        if (state.currentQuote) {
          checkIfCurrentQuoteIsFavorited();
        }
        loadFavoritesList();
        refreshStats();
      }
    } catch (err) {
      showToast('Could not delete favorite', 'warn');
    }
  }

  async function checkIfCurrentQuoteIsFavorited() {
    if (!state.currentQuote) return;
    try {
      const res = await fetch(`/api/favorites?search=${encodeURIComponent(state.currentQuote.author)}`);
      const data = await res.json();
      if (data.success) {
        const found = data.favorites.some(f => f.text === state.currentQuote.text);
        state.isFavorite = found;
        updateFavoriteBtnState(found);
      }
    } catch (e) {}
  }

  // ==========================================
  // COPY TO CLIPBOARD
  // ==========================================
  async function copyQuoteToClipboard(text, author) {
    const formatted = `"${text}" — ${author}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formatted);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      // Visual feedback on button
      el.copyBtn.classList.add('copied');
      el.copyBtnLabel.textContent = 'Copied!';
      showToast('Quote copied to clipboard!', 'success');

      setTimeout(() => {
        el.copyBtn.classList.remove('copied');
        el.copyBtnLabel.textContent = 'Copy';
      }, 2000);
    } catch (err) {
      showToast('Failed to copy to clipboard', 'warn');
    }
  }

  // ==========================================
  // TEXT-TO-SPEECH
  // ==========================================
  function speakCurrentQuote() {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech not supported in this browser', 'warn');
      return;
    }

    if (state.isSpeaking) {
      window.speechSynthesis.cancel();
      state.isSpeaking = false;
      el.speakBtn.classList.remove('speaking');
      return;
    }

    if (!state.currentQuote) return;

    const utteranceText = `${state.currentQuote.text}. By ${state.currentQuote.author}`;
    const utterance = new SpeechSynthesisUtterance(utteranceText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      state.isSpeaking = true;
      el.speakBtn.classList.add('speaking');
    };

    utterance.onend = () => {
      state.isSpeaking = false;
      el.speakBtn.classList.remove('speaking');
    };

    utterance.onerror = () => {
      state.isSpeaking = false;
      el.speakBtn.classList.remove('speaking');
    };

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================
  // SOCIAL SHARING
  // ==========================================
  function shareTwitter() {
    if (!state.currentQuote) return;
    const text = `"${state.currentQuote.text}" — ${state.currentQuote.author}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=quote,inspiration,${state.currentQuote.topic.toLowerCase()}`;
    window.open(url, '_blank');
  }

  function shareWhatsApp() {
    if (!state.currentQuote) return;
    const text = `"${state.currentQuote.text}" — ${state.currentQuote.author}\n\nShared via Inspirify Vault`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // ==========================================
  // VAULT & HISTORY DATA RETRIEVAL
  // ==========================================
  function refreshVault() {
    if (state.activeVaultTab === 'favorites') {
      loadFavoritesList();
    } else if (state.activeVaultTab === 'history') {
      loadHistoryList();
    } else {
      loadDatasetList();
    }
  }

  async function loadFavoritesList() {
    const params = new URLSearchParams();
    if (state.vaultTopic && state.vaultTopic !== 'all') params.append('topic', state.vaultTopic);
    if (state.vaultSearch) params.append('search', state.vaultSearch);
    if (state.vaultSort) params.append('sort', state.vaultSort);

    try {
      const res = await fetch(`/api/favorites?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        state.favoritesList = data.favorites;
        el.favoritesBadge.textContent = data.count;
        el.navFavoritesCount.textContent = data.count;
        el.statFavoritesCount.textContent = data.count;
        renderVaultCards(data.favorites, 'favorites');
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  }

  async function loadHistoryList() {
    const params = new URLSearchParams();
    if (state.vaultTopic && state.vaultTopic !== 'all') params.append('topic', state.vaultTopic);
    if (state.vaultSearch) params.append('search', state.vaultSearch);

    try {
      const res = await fetch(`/api/history?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        state.historyList = data.history;
        el.historyBadge.textContent = data.count;
        el.statHistoryCount.textContent = data.count;
        renderVaultCards(data.history, 'history');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }

  async function loadDatasetList() {
    const params = new URLSearchParams();
    if (state.vaultTopic && state.vaultTopic !== 'all') params.append('topic', state.vaultTopic);

    try {
      const res = await fetch(`/api/quotes/fallback?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        state.datasetList = data.quotes;
        renderVaultCards(data.quotes, 'dataset');
      }
    } catch (err) {
      console.error('Error loading dataset:', err);
    }
  }

  async function refreshStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        el.statFavoritesCount.textContent = data.stats.totalFavorites || 0;
        el.statHistoryCount.textContent = data.stats.totalHistory || 0;
        el.navFavoritesCount.textContent = data.stats.totalFavorites || 0;
        el.favoritesBadge.textContent = data.stats.totalFavorites || 0;
        el.historyBadge.textContent = data.stats.totalHistory || 0;
      }
    } catch (e) {}
  }

  // ==========================================
  // RENDER VAULT LIST CARDS
  // ==========================================
  function renderVaultCards(items, type) {
    el.vaultListContainer.innerHTML = '';

    if (!items || items.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      if (type === 'favorites') {
        emptyDiv.innerHTML = `
          <div class="empty-icon">⭐</div>
          <p class="empty-title">No favorites match</p>
          <p class="empty-desc">Save quotes by clicking the heart button on the quote stage.</p>
        `;
      } else if (type === 'history') {
        emptyDiv.innerHTML = `
          <div class="empty-icon">📜</div>
          <p class="empty-title">History is empty</p>
          <p class="empty-desc">Quotes you view will be automatically logged here.</p>
        `;
      } else {
        emptyDiv.innerHTML = `
          <div class="empty-icon">📂</div>
          <p class="empty-title">No records found</p>
          <p class="empty-desc">Try clearing the search or topic filters.</p>
        `;
      }
      el.vaultListContainer.appendChild(emptyDiv);
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'vault-card';

      const topicClass = (item.topic || '').toLowerCase().includes('learn')
        ? 'pill-learning'
        : (item.topic || '').toLowerCase().includes('work')
          ? 'pill-work'
          : 'pill-creativity';

      let actionsHtml = '';
      if (type === 'favorites') {
        actionsHtml = `
          <button class="vault-icon-btn copy-card-btn" title="Copy text" data-text="${escapeQuotes(item.text)}" data-author="${escapeQuotes(item.author)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="vault-icon-btn view-card-btn" title="Display on stage" data-id="${item.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="vault-icon-btn delete-btn delete-fav-btn" title="Delete from favorites" data-id="${item.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        `;
      } else if (type === 'history') {
        const isFav = item.is_favorite;
        actionsHtml = `
          <button class="vault-icon-btn copy-card-btn" title="Copy text" data-text="${escapeQuotes(item.text)}" data-author="${escapeQuotes(item.author)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="vault-icon-btn fav-toggle-btn ${isFav ? 'is-fav' : ''}" title="${isFav ? 'Favorited' : 'Add to favorites'}" data-text="${escapeQuotes(item.text)}" data-author="${escapeQuotes(item.author)}" data-topic="${escapeQuotes(item.topic || 'General')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="vault-icon-btn view-card-btn" title="Display on stage" data-id="${item.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        `;
      } else {
        // dataset
        actionsHtml = `
          <button class="vault-icon-btn copy-card-btn" title="Copy text" data-text="${escapeQuotes(item.text)}" data-author="${escapeQuotes(item.author)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="vault-icon-btn view-card-btn" title="Load into quote stage" data-text="${escapeQuotes(item.text)}" data-author="${escapeQuotes(item.author)}" data-topic="${escapeQuotes(item.topic)}" data-id="${item.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        `;
      }

      card.innerHTML = `
        <div class="vault-card-header">
          <span class="vault-card-tag ${topicClass}">${item.topic || 'General'}</span>
          <span class="vault-card-time">${formatDate(item.created_at || item.viewed_at)}</span>
        </div>
        <p class="vault-card-text" title="Click to view on stage">“${item.text}”</p>
        <div class="vault-card-footer">
          <span class="vault-card-author">— ${item.author}</span>
          <div class="vault-card-actions">${actionsHtml}</div>
        </div>
      `;

      // Click card text to display on stage
      const textElem = card.querySelector('.vault-card-text');
      if (textElem) {
        textElem.addEventListener('click', () => {
          renderQuote(
            { id: item.quote_id || item.id, text: item.text, author: item.author, topic: item.topic, source: item.source || 'vault' },
            type === 'favorites' ? true : (item.is_favorite || false),
            false,
            item.source || 'vault'
          );
          if (window.innerWidth <= 1024) {
            el.vaultPanel.classList.remove('open');
          }
        });
      }

      // Bind Delete Button
      const delBtn = card.querySelector('.delete-fav-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeFavoriteById(delBtn.dataset.id);
        });
      }

      // Bind Copy Button
      const copyBtn = card.querySelector('.copy-card-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          copyQuoteToClipboard(copyBtn.dataset.text, copyBtn.dataset.author);
        });
      }

      // Bind View Button
      const viewBtn = card.querySelector('.view-card-btn');
      if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          renderQuote(
            { id: item.quote_id || item.id, text: item.text, author: item.author, topic: item.topic, source: item.source || 'vault' },
            type === 'favorites' ? true : (item.is_favorite || false),
            false,
            item.source || 'vault'
          );
          if (window.innerWidth <= 1024) {
            el.vaultPanel.classList.remove('open');
          }
        });
      }

      // Bind History Fav toggle
      const histFavBtn = card.querySelector('.fav-toggle-btn');
      if (histFavBtn) {
        histFavBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetText = histFavBtn.dataset.text;
          const targetAuthor = histFavBtn.dataset.author;
          const targetTopic = histFavBtn.dataset.topic;

          try {
            const res = await fetch('/api/favorites/toggle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: targetText, author: targetAuthor, topic: targetTopic })
            });
            const d = await res.json();
            if (d.success) {
              showToast(d.isFavorite ? 'Saved to favorites' : 'Removed from favorites', 'info');
              loadHistoryList();
              refreshStats();
              if (state.currentQuote && state.currentQuote.text === targetText) {
                state.isFavorite = d.isFavorite;
                updateFavoriteBtnState(d.isFavorite);
              }
            }
          } catch (err) {}
        });
      }

      el.vaultListContainer.appendChild(card);
    });
  }

  // ==========================================
  // EXPORT UTILITIES (JSON / CSV)
  // ==========================================
  function exportFavoritesJson() {
    if (!state.favoritesList || state.favoritesList.length === 0) {
      showToast('No favorites to export', 'warn');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.favoritesList, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `inspirify-favorites-${Date.now()}.json`);
    dlAnchor.click();
    showToast('Favorites exported as JSON', 'success');
  }

  function exportFavoritesCsv() {
    if (!state.favoritesList || state.favoritesList.length === 0) {
      showToast('No favorites to export', 'warn');
      return;
    }

    const headers = ['ID', 'Topic', 'Author', 'Quote', 'Source', 'CreatedAt'];
    const rows = state.favoritesList.map(item => [
      item.id,
      `"${(item.topic || '').replace(/"/g, '""')}"`,
      `"${(item.author || '').replace(/"/g, '""')}"`,
      `"${(item.text || '').replace(/"/g, '""')}"`,
      `"${(item.source || '').replace(/"/g, '""')}"`,
      `"${(item.created_at || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `inspirify-favorites-${Date.now()}.csv`);
    dlAnchor.click();
    showToast('Favorites exported as CSV', 'success');
  }

  async function clearAllHistory() {
    if (!confirm('Are you sure you want to clear your quote viewing history?')) return;

    try {
      const res = await fetch('/api/history/clear', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('History cleared', 'info');
        loadHistoryList();
        refreshStats();
      }
    } catch (e) {
      showToast('Failed to clear history', 'warn');
    }
  }

  // ==========================================
  // EVENT LISTENERS BINDING
  // ==========================================
  function bindEvents() {
    // Theme Toggle
    el.themeToggleBtn.addEventListener('click', toggleTheme);

    // Fallback Mode Toggle Switch
    el.fallbackToggle.addEventListener('change', (e) => {
      state.forceFallback = e.target.checked;
      if (state.forceFallback) {
        showToast('Offline Fallback Mode activated', 'warn');
      } else {
        showToast('Switched to Live API Mode', 'info');
      }
      fetchNextQuote();
    });

    // Dismiss Alert Banner
    el.dismissAlertBtn.addEventListener('click', () => {
      el.fallbackNoticeBanner.classList.add('hidden');
    });

    // Mode Tabs (Random vs Daily)
    el.modeRandomBtn.addEventListener('click', () => {
      if (state.mode === 'random') return;
      state.mode = 'random';
      el.modeRandomBtn.classList.add('active');
      el.modeDailyBtn.classList.remove('active');
      el.topicFilterBar.style.display = 'flex';
      fetchNextQuote();
    });

    el.modeDailyBtn.addEventListener('click', () => {
      if (state.mode === 'daily') return;
      state.mode = 'daily';
      el.modeDailyBtn.classList.add('active');
      el.modeRandomBtn.classList.remove('active');
      el.topicFilterBar.style.display = 'none';
      fetchNextQuote();
    });

    // Topic Filter Chips
    el.topicFilterBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.topic-chip');
      if (!chip) return;

      document.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.topic = chip.dataset.topic;
      fetchNextQuote();
    });

    // Generate / Next Quote
    el.newQuoteBtn.addEventListener('click', fetchNextQuote);

    // Keyboard navigation (Spacebar or Right Arrow for next quote)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      if (e.code === 'Space' || e.key === 'ArrowRight') {
        e.preventDefault();
        fetchNextQuote();
      }
    });

    // Favorite Toggle
    el.favoriteBtn.addEventListener('click', toggleFavorite);

    // Copy to Clipboard
    el.copyBtn.addEventListener('click', () => {
      if (!state.currentQuote) return;
      copyQuoteToClipboard(state.currentQuote.text, state.currentQuote.author);
    });

    // Text to Speech
    el.speakBtn.addEventListener('click', speakCurrentQuote);

    // Canvas Image Export
    el.exportImageBtn.addEventListener('click', () => {
      if (!state.currentQuote) return;
      if (window.QuoteCanvasExporter) {
        showToast('Generating PNG quote card...', 'info');
        window.QuoteCanvasExporter.exportQuoteCard(state.currentQuote);
      }
    });

    // Social Sharing
    el.shareTwitterBtn.addEventListener('click', shareTwitter);
    el.shareWhatsAppBtn.addEventListener('click', shareWhatsApp);

    // Vault Mobile Drawer Toggle
    el.drawerToggleBtn.addEventListener('click', () => {
      el.vaultPanel.classList.toggle('open');
    });

    el.closeVaultBtn.addEventListener('click', () => {
      el.vaultPanel.classList.remove('open');
    });

    // Vault Tab Switching
    el.tabFavorites.addEventListener('click', () => {
      switchVaultTab('favorites');
    });

    el.tabHistory.addEventListener('click', () => {
      switchVaultTab('history');
    });

    el.tabFallbackPool.addEventListener('click', () => {
      switchVaultTab('dataset');
    });

    // Vault Search Input
    let searchDebounce;
    el.vaultSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      state.vaultSearch = e.target.value.trim();
      el.clearSearchBtn.classList.toggle('hidden', state.vaultSearch === '');

      searchDebounce = setTimeout(() => {
        refreshVault();
      }, 250);
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.vaultSearchInput.value = '';
      state.vaultSearch = '';
      el.clearSearchBtn.classList.add('hidden');
      refreshVault();
    });

    // Vault Topic Filter
    el.vaultTopicSelect.addEventListener('change', (e) => {
      state.vaultTopic = e.target.value;
      refreshVault();
    });

    // Vault Sort Order
    el.vaultSortSelect.addEventListener('change', (e) => {
      state.vaultSort = e.target.value;
      refreshVault();
    });

    // Export Buttons
    el.exportJsonBtn.addEventListener('click', exportFavoritesJson);
    el.exportCsvBtn.addEventListener('click', exportFavoritesCsv);
    el.clearHistoryBtn.addEventListener('click', clearAllHistory);
  }

  function switchVaultTab(tab) {
    state.activeVaultTab = tab;
    el.tabFavorites.classList.toggle('active', tab === 'favorites');
    el.tabHistory.classList.toggle('active', tab === 'history');
    el.tabFallbackPool.classList.toggle('active', tab === 'dataset');

    // Toggle utility buttons
    el.favoritesUtilButtons.classList.toggle('hidden', tab !== 'favorites');
    el.historyUtilButtons.classList.toggle('hidden', tab !== 'history');

    refreshVault();
  }

  // ==========================================
  // HELPERS
  // ==========================================
  function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function displayLocalFallback() {
    renderQuote(
      {
        id: 'fb-local-1',
        text: 'The best way to predict the future is to create it.',
        author: 'Peter Drucker',
        topic: 'Work',
        source: 'fallback'
      },
      false,
      true,
      'fallback'
    );
  }

  // Run on start
  init();
});
