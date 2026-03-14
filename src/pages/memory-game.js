/**
 * memory-game.js — 記憶カードゲーム（神経衰弱）
 * フラッシュカードの画像を流用した絵合わせゲーム
 * 難易度: 4ペア(8枚) / 6ペア(12枚)
 */
import { t, tBoth, getLang, getAge } from '../i18n.js';
import { playSound, speak, speakWord, speakWordBoth, speakUI } from '../audio.js';
import { categories, flashcardData } from '../data/flashcard-data.js';
import { recordGame } from '../progress.js';

/** 音声言語（中国語デフォルト） */
let voiceLang = 'zh';

/** public/ 配下の静的アセットURLを解決（GitHub Pages対応） */
const assetUrl = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  return path.startsWith('/') ? `${base}${path.slice(1)}` : `${base}${path}`;
};

/** 難易度設定 */
const DIFFICULTY = {
  easy: { pairs: 4, cols: 4, label: '简单 / かんたん' },
  hard: { pairs: 6, cols: 4, label: '困难 / むずかしい' },
};

let currentDifficulty = 'easy';
let cards = [];
let flipped = [];
let matched = [];
let lockBoard = false;
let moves = 0;

/**
 * 記憶ゲーム画面をレンダリング
 */
export function renderMemoryGame(container, navigate) {
  const appLang = getLang();
  voiceLang = appLang === 'ja' ? 'ja' : 'zh';
  renderDifficultySelect(container, navigate);
}

/**
 * 難易度選択画面
 */
function renderDifficultySelect(container, navigate) {
  container.innerHTML = `
    <div class="page" id="memory-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-mem">◀</button>
        <h1 class="page-title">${tBoth('memory').zh}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content">
        <div style="display: flex; flex-direction: column; gap: var(--space-lg); max-width: 300px; width: 100%;">
          <button class="home-card" id="btn-easy"
                  style="background: var(--color-green-soft); animation: popIn 0.5s ease both; padding: var(--space-lg);">
            <span class="home-card__icon">🌟</span>
            <span class="home-card__label">${DIFFICULTY.easy.label}</span>
            <span class="home-card__label-sub">4组 / 4ペア</span>
          </button>
          <button class="home-card" id="btn-hard"
                  style="background: var(--color-orange-soft); animation: popIn 0.5s ease 0.1s both; padding: var(--space-lg);">
            <span class="home-card__icon">⭐</span>
            <span class="home-card__label">${DIFFICULTY.hard.label}</span>
            <span class="home-card__label-sub">6组 / 6ペア</span>
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-back-mem').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });

  container.querySelector('#btn-easy').addEventListener('click', () => {
    currentDifficulty = 'easy';
    playSound('chime');
    startGame(container, navigate);
  });

  container.querySelector('#btn-hard').addEventListener('click', () => {
    currentDifficulty = 'hard';
    playSound('chime');
    startGame(container, navigate);
  });
}

/**
 * ゲーム開始 — カードをシャッフルして配置
 */
function startGame(container, navigate) {
  const { pairs } = DIFFICULTY[currentDifficulty];
  flipped = [];
  matched = [];
  lockBoard = false;
  moves = 0;

  // 年齢に応じたカテゴリからカードを選択
  const age = getAge();
  const ageOrder = { '1-2': 1, '3-4': 2, '5-6': 3 };
  const currentLevel = ageOrder[age] || 1;
  const availableCats = categories.filter(c => ageOrder[c.ageGroup] <= currentLevel);

  // 全カードをプールし、ランダムに pairs 枚選択
  let allCards = [];
  availableCats.forEach(cat => {
    const catCards = flashcardData[cat.id] || [];
    catCards.forEach(card => allCards.push(card));
  });

  // シャッフルして pairs 枚選択
  shuffleArray(allCards);
  const selected = allCards.slice(0, pairs);

  // ペアを作成（各カード2枚ずつ）
  cards = [];
  selected.forEach((card, idx) => {
    cards.push({ ...card, pairId: idx, uid: idx * 2 });
    cards.push({ ...card, pairId: idx, uid: idx * 2 + 1 });
  });
  shuffleArray(cards);

  renderBoard(container, navigate);
}

/**
 * ゲームボードをレンダリング
 */
function renderBoard(container, navigate) {
  const { cols } = DIFFICULTY[currentDifficulty];

  container.innerHTML = `
    <div class="page" id="memory-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-mem-game">◀</button>
        <h1 class="page-title">${tBoth('memory').zh}</h1>
        <button class="btn-back math-lang-toggle" id="btn-lang-mem"
                style="font-size: 1.1rem; min-width: 44px;">
          ${voiceLang === 'zh' ? '🇨🇳' : '🇯🇵'}
        </button>
      </div>
      <div style="text-align:center; font-size: var(--font-size-sm); padding: 0 0 var(--space-xs);">${moves}手</div>

      <div class="page-content page-content--scrollable">
        <div class="mem-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
          ${cards.map((card, i) => {
    const isFlipped = flipped.includes(i) || matched.includes(card.pairId);
    return `
              <div class="mem-card ${isFlipped ? 'mem-card--flipped' : ''} ${matched.includes(card.pairId) ? 'mem-card--matched' : ''}"
                   data-index="${i}"
                   style="animation: popIn 0.3s ease ${i * 0.03}s both;">
                <div class="mem-card__inner">
                  <div class="mem-card__front">❓</div>
                  <div class="mem-card__back">
                    <img src="${assetUrl(card.image)}" alt="${card.zh}"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <span class="mem-card__emoji" style="display:none;">${card.emoji}</span>
                    <span class="mem-card__label">${voiceLang === 'zh' ? card.zh : card.ja}</span>
                  </div>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>
    </div>
  `;

  // 戻るボタン
  container.querySelector('#btn-back-mem-game').addEventListener('click', () => {
    playSound('pop');
    renderDifficultySelect(container, navigate);
  });

  // 言語切替
  container.querySelector('#btn-lang-mem').addEventListener('click', () => {
    voiceLang = voiceLang === 'zh' ? 'ja' : 'zh';
    playSound('pop');
    renderBoard(container, navigate);
  });

  // カードクリック
  container.querySelectorAll('.mem-card:not(.mem-card--matched)').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      handleCardClick(container, navigate, idx);
    });
  });
}

/**
 * カードクリック処理
 */
function handleCardClick(container, navigate, idx) {
  if (lockBoard) return;
  if (flipped.includes(idx)) return;
  if (matched.includes(cards[idx].pairId)) return;

  flipped.push(idx);
  playSound('pop');

  // カードをめくるアニメーション
  const cardEl = container.querySelectorAll('.mem-card')[idx];
  cardEl.classList.add('mem-card--flipped');

  // MP3ファイルで読み上げ（imageパスからcategoryとfileKeyを抽出）
  const imgParts = cards[idx].image.split('/');
  const category = imgParts[imgParts.length - 2]; // e.g. 'animals'
  const fileKey = imgParts[imgParts.length - 1].replace('.png', ''); // e.g. 'dog'
  speakWord(category, fileKey, voiceLang === 'zh' ? cards[idx].zh : cards[idx].ja, voiceLang);

  if (flipped.length === 2) {
    lockBoard = true;
    moves++;
    const movesEl = container.querySelector('#mem-moves');
    if (movesEl) movesEl.textContent = `${moves}手`;

    const [first, second] = flipped;
    if (cards[first].pairId === cards[second].pairId) {
      // マッチ成功！
      matched.push(cards[first].pairId);
      flipped = [];
      lockBoard = false;
      playSound('chime');

      // マッチアニメーション
      container.querySelectorAll('.mem-card').forEach(el => {
        const i = parseInt(el.dataset.index);
        if (i === first || i === second) {
          el.classList.add('mem-card--matched');
        }
      });

      // 全てマッチしたか確認
      const { pairs } = DIFFICULTY[currentDifficulty];
      if (matched.length === pairs) {
        recordGame('memory-game', pairs, pairs);
        setTimeout(() => renderComplete(container, navigate), 800);
      }
    } else {
      // マッチ失敗 — 1.2秒後にひっくり返す
      setTimeout(() => {
        container.querySelectorAll('.mem-card').forEach(el => {
          const i = parseInt(el.dataset.index);
          if (i === first || i === second) {
            el.classList.remove('mem-card--flipped');
          }
        });
        flipped = [];
        lockBoard = false;
      }, 1200);
    }
  }
}

/**
 * クリア画面
 */
function renderComplete(container, navigate) {
  const { pairs } = DIFFICULTY[currentDifficulty];
  const perfect = moves <= pairs + 2;
  const great = moves <= pairs * 2;

  const msg = perfect
    ? { zh: '太棒了！完美！💯', ja: 'すごーい！かんぺき！💯' }
    : great
      ? { zh: '做得很好！🎉', ja: 'よくできました！🎉' }
      : { zh: '加油！再来一次！😊', ja: 'がんばったね！😊' };

  const stars = perfect ? '⭐⭐⭐' : great ? '⭐⭐' : '⭐';

  container.innerHTML = `
    <div class="page" id="memory-result-page">
      <div class="page-header">
        <div style="width:44px"></div>
        <h1 class="page-title">${tBoth('memory').zh}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content">
        <div class="math-result" style="animation: popIn 0.6s ease both;">
          <div class="math-result__stars">${stars}</div>
          <div class="math-result__score">${moves}手</div>
          <div class="math-result__message">${msg.zh}<br><span style="font-size: var(--font-size-sm); color: var(--color-text-light);">${msg.ja}</span></div>
        </div>
        <div class="math-result__actions" style="animation: slideUp 0.5s ease 0.3s both;">
          <button class="math-result__btn math-result__btn--retry" id="btn-mem-retry">
            ${tBoth('mathRetry').zh}
          </button>
          <button class="math-result__btn math-result__btn--home" id="btn-mem-home">
            ${tBoth('back').zh}
          </button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const uiKey = perfect ? 'perfect' : great ? 'great' : 'tryagain';
    speakUI(uiKey, msg[voiceLang], voiceLang);
  }, 600);

  container.querySelector('#btn-mem-retry').addEventListener('click', () => {
    playSound('chime');
    renderDifficultySelect(container, navigate);
  });

  container.querySelector('#btn-mem-home').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });
}

/** Fisher-Yates シャッフル */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
