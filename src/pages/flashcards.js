/**
 * flashcards.js — フラッシュカード画面
 * カテゴリ選択 → カード表示 → タップで読み上げ＆次のカードへ
 * 年齢グループに応じてカテゴリをフィルタリング
 */
import { t, tBoth, getLang, getAge } from '../i18n.js';
import { playSound, speak, speakBoth, speakWord, speakWordBoth } from '../audio.js';
import { categories, flashcardData } from '../data/flashcard-data.js';

/** public/ 配下の静的アセットURLを解決（GitHub Pages対応） */
const assetUrl = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  // path が /images/... 形式の場合、先頭の / を除いて base と結合
  return path.startsWith('/') ? `${base}${path.slice(1)}` : `${base}${path}`;
};

/**
 * 年齢に応じたカテゴリをフィルタリング
 * '1-2' → 1-2歳のみ
 * '3-4' → 1-2歳 + 3-4歳
 * '5-6' → 全カテゴリ
 */
function getFilteredCategories() {
  const age = getAge();
  const ageOrder = { '1-2': 1, '3-4': 2, '5-6': 3 };
  const currentLevel = ageOrder[age] || 1;
  return categories.filter((cat) => {
    const catLevel = ageOrder[cat.ageGroup] || 1;
    return catLevel <= currentLevel;
  });
}

/**
 * フラッシュカード画面をレンダリング
 */
export function renderFlashcards(container, navigate) {
  renderCategorySelect(container, navigate);
}

function renderCategorySelect(container, navigate) {
  const filteredCats = getFilteredCategories();

  container.innerHTML = `
    <div class="page" id="flashcard-categories">
      <div class="page-header">
        <button class="btn-back" id="btn-back">◀</button>
        <h1 class="page-title">${t('flashcards')}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content page-content--scrollable">
        <div class="category-grid">
          ${filteredCats
      .map(
        (cat, i) => `
            <button class="category-card" data-cat="${cat.id}"
                    style="background: var(${cat.colorSoftVar}); animation: popIn 0.4s ease ${i * 0.08}s both;">
              <img class="category-card__icon-img" 
                   src="${assetUrl(cat.categoryImage)}" 
                   alt="${tBoth(cat.id).zh}"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span class="category-card__icon" style="display:none;">${cat.icon}</span>
              <span class="category-card__label">${tBoth(cat.id).zh}</span>
              <span class="category-card__label-sub">${tBoth(cat.id).ja}</span>
            </button>
          `
      )
      .join('')}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-back').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });

  container.querySelectorAll('.category-card').forEach((card) => {
    card.addEventListener('click', () => {
      playSound('chime');
      renderCardView(container, navigate, card.dataset.cat);
    });
  });
}

function renderCardView(container, navigate, categoryId) {
  const cards = flashcardData[categoryId];
  if (!cards || cards.length === 0) return;

  let currentIndex = 0;
  const cat = categories.find((c) => c.id === categoryId);

  function renderCard() {
    const card = cards[currentIndex];
    const lang = getLang();

    container.innerHTML = `
      <div class="page" id="flashcard-view" style="background: var(${cat.colorSoftVar});">
        <div class="page-header">
          <button class="btn-back" id="btn-back-card">◀</button>
          <h1 class="page-title">${t(categoryId)}</h1>
          <div style="width:44px"></div>
        </div>
        <div class="flashcard-container">
          <div class="flashcard" id="flashcard-main">
            <img class="flashcard__image" 
                 src="${assetUrl(card.image)}" 
                 alt="${card.zh}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <span class="flashcard__emoji" style="display:none;">${card.emoji}</span>
            ${lang === 'zh' || lang === 'both'
        ? `
              <span class="flashcard__text-zh">${card.zh}</span>
              <span class="flashcard__pinyin">${card.pinyin}</span>
            `
        : ''
      }
            ${lang === 'ja' || lang === 'both'
        ? `<span class="flashcard__text-ja">${card.ja}</span>`
        : ''
      }
          </div>
          <div class="flashcard-nav">
            <button class="flashcard-nav__btn" id="btn-prev" ${currentIndex === 0 ? 'style="visibility:hidden"' : ''}>◀</button>
            <span class="flashcard-nav__counter">${currentIndex + 1} ${t('of')} ${cards.length}</span>
            <button class="flashcard-nav__btn" id="btn-next" ${currentIndex === cards.length - 1 ? 'style="visibility:hidden"' : ''}>▶</button>
          </div>
        </div>
      </div>
    `;

    // カードをタップ → 読み上げアニメーション
    const flashcardEl = container.querySelector('#flashcard-main');
    flashcardEl.addEventListener('click', async () => {
      flashcardEl.classList.add('animate-bounce');
      playSound('sparkle');

      // imageパスからファイルキーを抽出 (e.g. '/images/animals/dog.png' -> 'dog')
      const fileKey = card.image.split('/').pop().replace('.png', '');

      // 常に中国語→日本語の順で読み上げ
      await speakWordBoth(categoryId, fileKey, card.ja, card.zh);

      setTimeout(() => flashcardEl.classList.remove('animate-bounce'), 600);
    });

    // ナビゲーション
    container.querySelector('#btn-back-card').addEventListener('click', () => {
      playSound('pop');
      renderCategorySelect(container, navigate);
    });

    const prevBtn = container.querySelector('#btn-prev');
    const nextBtn = container.querySelector('#btn-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
          currentIndex--;
          playSound('pop');
          renderCard();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentIndex < cards.length - 1) {
          currentIndex++;
          playSound('pop');
          renderCard();
        }
      });
    }

    // 初回自動読み上げ（中国語→日本語）
    setTimeout(async () => {
      const fileKey = card.image.split('/').pop().replace('.png', '');
      await speakWordBoth(categoryId, fileKey, card.ja, card.zh);
    }, 500);
  }

  renderCard();
}
