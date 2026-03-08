/**
 * home.js — ホーム画面
 * 大きなカードアイコンでメニューを表示
 * 年齢セレクター付き
 */
import { t, tBoth, getAge, setAge } from '../i18n.js';
import { playSound, initAudio } from '../audio.js';

/**
 * ホーム画面をレンダリング
 * @param {HTMLElement} container
 * @param {(page: string) => void} navigate
 */
export function renderHome(container, navigate) {
  const allMenuItems = [
    { id: 'flashcards', icon: '🃏', labelKey: 'flashcards', bg: 'var(--color-yellow-soft)' },
    { id: 'memory-game', icon: '🎴', labelKey: 'memory', bg: 'var(--color-pink-soft)' },
    { id: 'touch-play', icon: '👆', labelKey: 'touchPlay', bg: 'var(--color-pink-soft)' },
    { id: 'videos', icon: '🎬', labelKey: 'videos', bg: 'var(--color-blue-soft)' },
    { id: 'music', icon: '🎵', labelKey: 'music', bg: 'var(--color-green-soft)' },
    { id: 'hiragana', icon: 'あ', labelKey: 'hiragana', bg: 'var(--color-purple-soft)', ageGroup: '5-6' },
    { id: 'katakana', icon: 'ア', labelKey: 'katakana', bg: 'var(--color-purple-soft)', ageGroup: '5-6' },
    { id: 'pinyin', icon: '拼', labelKey: 'pinyin', bg: 'var(--color-blue-soft)', ageGroup: '5-6' },
    { id: 'math-game', icon: '🧮', labelKey: 'math', bg: 'var(--color-orange-soft)', ageGroup: '5-6' },
  ];

  // 年齢フィルタリング
  const currentAge = getAge();
  const ageOrder = { '1-2': 1, '3-4': 2, '5-6': 3 };
  const currentLevel = ageOrder[currentAge] || 1;
  const menuItems = allMenuItems.filter(item => {
    if (!item.ageGroup) return true;
    return ageOrder[item.ageGroup] <= currentLevel;
  });

  container.innerHTML = `
    <div class="page" id="home-page">
      <!-- 背景装飾 -->
      <div class="deco-shape deco-shape--1"></div>
      <div class="deco-shape deco-shape--2"></div>
      <div class="deco-shape deco-shape--3"></div>

      <div class="page-header">
        <div style="width:44px"></div>
        <h1 class="page-title" style="font-size: var(--font-size-xl);">
          <span class="title-zh">笑笑学园</span>
          <span class="title-ja">にこにこ学園</span>
        </h1>
        <button class="btn-back" id="btn-settings" aria-label="${t('settings')}" style="font-size: 1.2rem;">
          ⚙️
        </button>
      </div>

      <!-- 年齢セレクター -->
      <div class="age-selector" id="age-selector">
        <button class="age-selector__btn ${currentAge === '1-2' ? 'active' : ''}" data-age="1-2">
          🍼 ${t('age12')}
        </button>
        <button class="age-selector__btn ${currentAge === '3-4' ? 'active' : ''}" data-age="3-4">
          🧸 ${t('age34')}
        </button>
        <button class="age-selector__btn ${currentAge === '5-6' ? 'active' : ''}" data-age="5-6">
          📚 ${t('age56')}
        </button>
      </div>

      <div class="page-content page-content--scrollable">
        <div class="home-grid">
          ${menuItems
      .map(
        (item, i) => `
            <button class="home-card" data-page="${item.id}" 
                    style="background: ${item.bg}; animation-delay: ${i * 0.1}s; animation: popIn 0.5s ease ${i * 0.1}s both;">
              <span class="home-card__icon">${item.icon}</span>
              <span class="home-card__label">${tBoth(item.labelKey).zh}</span>
              <span class="home-card__label-sub">${tBoth(item.labelKey).ja}</span>
            </button>
          `
      )
      .join('')}
        </div>
      </div>
    </div>
  `;

  // イベントリスナー: メニューカード
  container.querySelectorAll('.home-card').forEach((card) => {
    card.addEventListener('click', () => {
      initAudio();
      playSound('pop');
      navigate(card.dataset.page);
    });
  });

  // イベントリスナー: 年齢セレクター
  container.querySelectorAll('.age-selector__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playSound('pop');
      setAge(btn.dataset.age);
      renderHome(container, navigate);
    });
  });

  // 設定ボタン — 3回連続タップで開く（子供の誤操作防止）
  let settingsTapCount = 0;
  let settingsTapTimer = null;
  const settingsBtn = container.querySelector('#btn-settings');
  settingsBtn.addEventListener('click', () => {
    settingsTapCount++;
    clearTimeout(settingsTapTimer);
    settingsTapTimer = setTimeout(() => {
      settingsTapCount = 0;
    }, 1500);
    if (settingsTapCount >= 3) {
      settingsTapCount = 0;
      navigate('settings');
    }
  });
}
