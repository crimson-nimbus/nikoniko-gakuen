/**
 * kanji-intro.js — 漢字入門ページ
 * 基本的な漢字を3カテゴリ（数字・自然・動物）で学ぶ
 * タップで読み上げ + 書き順ストローク表示
 */
import { t, tBoth, getLang } from '../i18n.js';
import { playSound, speak, speakBoth, speakWord, speakWordBoth } from '../audio.js';
import { recordKanjiView } from '../progress.js';

/** 漢字データ: [漢字, ピンイン, 中国語意味, 日本語読み, 画数, 日本の新字体(簡体字と異なる場合のみ)] */
const KANJI_CATEGORIES = [
  {
    id: 'numbers',
    labelZh: '数字',
    labelJa: 'すうじ',
    icon: '🔢',
    color: '#FFD1A3',
    chars: [
      ['一', 'yī', '1', 'いち', 1],
      ['二', 'èr', '2', 'に', 2],
      ['三', 'sān', '3', 'さん', 3],
      ['四', 'sì', '4', 'し/よん', 5],
      ['五', 'wǔ', '5', 'ご', 4],
      ['六', 'liù', '6', 'ろく', 4],
      ['七', 'qī', '7', 'しち/なな', 2],
      ['八', 'bā', '8', 'はち', 2],
      ['九', 'jiǔ', '9', 'きゅう', 2],
      ['十', 'shí', '10', 'じゅう', 2],
    ],
  },
  {
    id: 'nature',
    labelZh: '自然',
    labelJa: 'しぜん',
    icon: '🌿',
    color: '#A3F5C8',
    chars: [
      ['日', 'rì', '太阳', 'ひ/にち', 4],
      ['月', 'yuè', '月亮', 'つき/げつ', 4],
      ['水', 'shuǐ', '水', 'みず/すい', 4],
      ['火', 'huǒ', '火', 'ひ/か', 4],
      ['山', 'shān', '山', 'やま/さん', 3],
      ['木', 'mù', '树', 'き/もく', 4],
      ['花', 'huā', '花', 'はな/か', 7],
      ['雨', 'yǔ', '雨', 'あめ/う', 8],
      ['风', 'fēng', '风', 'かぜ/ふう', 4, '風'],
      ['天', 'tiān', '天空', 'てん/あま', 4],
    ],
  },
  {
    id: 'animals',
    labelZh: '动物',
    labelJa: 'どうぶつ',
    icon: '🐾',
    color: '#A3E8F5',
    chars: [
      ['马', 'mǎ', '马', 'うま/ば', 3, '馬'],
      ['牛', 'niú', '牛', 'うし/ぎゅう', 4],
      ['羊', 'yáng', '羊', 'ひつじ/よう', 6],
      ['鱼', 'yú', '鱼', 'さかな/ぎょ', 8, '魚'],
      ['鸟', 'niǎo', '鸟', 'とり/ちょう', 5, '鳥'],
      ['虫', 'chóng', '虫', 'むし/ちゅう', 6],
      ['犬', 'quǎn', '狗', 'いぬ/けん', 4],
      ['猫', 'māo', '猫', 'ねこ', 11],
      ['龙', 'lóng', '龙', 'りゅう', 5, '竜'],
      ['兔', 'tù', '兔子', 'うさぎ/と', 8, '兎'],
    ],
  },
];

let currentCatIdx = -1; // -1 = カテゴリ選択画面
let currentCharIdx = 0;

/**
 * 漢字入門ページをレンダリング
 */
export function renderKanjiIntro(container, navigate) {
  currentCatIdx = -1;
  renderCategorySelect(container, navigate);
}

/**
 * カテゴリ選択画面
 */
function renderCategorySelect(container, navigate) {
  container.innerHTML = `
    <div class="page" id="kanji-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-kanji">◀</button>
        <h1 class="page-title">${tBoth('kanjiIntro').zh}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content page-content--scrollable">
        <div class="kanji-cat-grid">
          ${KANJI_CATEGORIES.map((cat, i) => `
            <button class="home-card kanji-cat-card" data-cat="${i}"
                    style="background: ${cat.color}; animation: popIn 0.5s ease ${i * 0.1}s both;">
              <span class="home-card__icon">${cat.icon}</span>
              <span class="home-card__label">${cat.labelZh}</span>
              <span class="home-card__label-sub">${cat.labelJa}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-back-kanji').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });

  container.querySelectorAll('.kanji-cat-card').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCatIdx = parseInt(btn.dataset.cat);
      currentCharIdx = 0;
      playSound('chime');
      renderCharDetail(container, navigate);
    });
  });
}

/**
 * 漢字詳細画面（1文字ずつ表示）
 */
function renderCharDetail(container, navigate) {
  const cat = KANJI_CATEGORIES[currentCatIdx];
  const [kanji, pinyin, zhMeaning, jaReading, strokes, kanjiJp] = cat.chars[currentCharIdx];
  const total = cat.chars.length;
  recordKanjiView();
  const isFirst = currentCharIdx === 0;
  const isLast = currentCharIdx === total - 1;

  container.innerHTML = `
    <div class="page" id="kanji-detail-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-kanji-detail">◀</button>
        <h1 class="page-title">${cat.labelZh} ${currentCharIdx + 1}/${total}</h1>
        <div style="width:44px"></div>
      </div>

      <div class="page-content">
        <!-- 大きい漢字表示 -->
        <div class="kanji-display" style="animation: popIn 0.5s ease both;">
          <span class="kanji-display__char" id="kanji-char">${kanji}</span>
          ${kanjiJp ? `<div style="display:flex; align-items:center; justify-content:center; gap: var(--space-md); margin-top: var(--space-sm);">
            <span style="font-size: 2.2rem; color: var(--color-text);">${kanji}</span>
            <span style="font-size: 1.2rem; color: var(--color-text-light);">简</span>
            <span style="font-size: 1.5rem; color: var(--color-text-light);">/</span>
            <span style="font-size: 2.2rem; color: var(--color-text);">${kanjiJp}</span>
            <span style="font-size: 1.2rem; color: var(--color-text-light);">日</span>
          </div>` : ''}
        </div>

        <!-- 情報 -->
        <div class="kanji-info" style="animation: slideUp 0.4s ease 0.2s both;">
          <div class="kanji-info__row">
            <span class="kanji-info__label">拼音</span>
            <span class="kanji-info__value">${pinyin}</span>
          </div>
          <div class="kanji-info__row">
            <span class="kanji-info__label">中文</span>
            <span class="kanji-info__value">${zhMeaning}</span>
          </div>
          <div class="kanji-info__row">
            <span class="kanji-info__label">日本語</span>
            <span class="kanji-info__value">${jaReading}</span>
          </div>
          <div class="kanji-info__row">
            <span class="kanji-info__label">笔画</span>
            <span class="kanji-info__value">${strokes}画</span>
          </div>
        </div>

        <!-- 読み上げボタン -->
        <div class="kanji-actions" style="animation: slideUp 0.4s ease 0.3s both;">
          <button class="kanji-speak-btn" id="btn-speak-zh" style="background: #FFE0E0;">
            🇨🇳 ${kanji}
          </button>
          <button class="kanji-speak-btn" id="btn-speak-ja" style="background: #E0E8FF;">
            🇯🇵 ${kanji}
          </button>
        </div>

        <!-- ナビゲーション -->
        <div class="kanji-nav" style="animation: fadeIn 0.4s ease 0.4s both;">
          <button class="kanji-nav__btn" id="btn-prev" ${isFirst ? 'disabled' : ''}>← 前</button>
          <button class="kanji-nav__btn" id="btn-next" ${isLast ? 'disabled' : ''}>次 →</button>
        </div>
      </div>
    </div>
  `;

  // 戻る
  container.querySelector('#btn-back-kanji-detail').addEventListener('click', () => {
    playSound('pop');
    renderCategorySelect(container, navigate);
  });

  // 漢字タップで両言語読み上げ
  const kanjiFileKey = kanji.codePointAt(0).toString(16).padStart(4, '0');

  container.querySelector('#kanji-char').addEventListener('click', () => {
    playSound('sparkle');
    speakWordBoth('kanji', kanjiFileKey, kanji, kanji);
  });

  // 個別読み上げボタン
  container.querySelector('#btn-speak-zh').addEventListener('click', () => {
    playSound('sparkle');
    speakWord('kanji', kanjiFileKey, kanji, 'zh');
  });

  container.querySelector('#btn-speak-ja').addEventListener('click', () => {
    playSound('sparkle');
    speakWord('kanji', kanjiFileKey, kanji, 'ja');
  });

  // ナビゲーション
  const prevBtn = container.querySelector('#btn-prev');
  const nextBtn = container.querySelector('#btn-next');

  if (!isFirst) {
    prevBtn.addEventListener('click', () => {
      currentCharIdx--;
      playSound('pop');
      renderCharDetail(container, navigate);
    });
  }

  if (!isLast) {
    nextBtn.addEventListener('click', () => {
      currentCharIdx++;
      playSound('pop');
      renderCharDetail(container, navigate);
    });
  }

  // 初回表示時に中国語で読み上げ
  setTimeout(() => speakWord('kanji', kanjiFileKey, kanji, 'zh'), 600);
}
