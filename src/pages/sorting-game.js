/**
 * sorting-game.js — 並べ替えゲーム
 * シャッフルされた要素を正しい順番に並べる
 * モード: 数字(1-10), ひらがな(あ行), ピンイン(声母)
 * ドラッグ&ドロップ風のタップ選択UI
 */
import { t, tBoth, getLang } from '../i18n.js';
import { playSound, speak } from '../audio.js';
import { recordGame } from '../progress.js';

const TOTAL_ROUNDS = 5;

/** 並べ替え問題の種類 */
const SORT_TYPES = [
    {
        id: 'numbers',
        labelZh: '数字排序',
        labelJa: 'すうじならべ',
        icon: '🔢',
        color: '#FFD1A3',
        generate: () => {
            const start = Math.floor(Math.random() * 6) + 1; // 1-6
            const items = [];
            for (let i = 0; i < 5; i++) items.push({ display: String(start + i), value: start + i, speak: String(start + i) });
            return items;
        },
    },
    {
        id: 'hiragana',
        labelZh: '假名排序',
        labelJa: 'ひらがなならべ',
        icon: 'あ',
        color: '#C8A3F5',
        generate: () => {
            const rows = [
                ['あ', 'い', 'う', 'え', 'お'],
                ['か', 'き', 'く', 'け', 'こ'],
                ['さ', 'し', 'す', 'せ', 'そ'],
                ['た', 'ち', 'つ', 'て', 'と'],
                ['な', 'に', 'ぬ', 'ね', 'の'],
            ];
            const row = rows[Math.floor(Math.random() * rows.length)];
            return row.map((ch, i) => ({ display: ch, value: i, speak: ch }));
        },
    },
    {
        id: 'size',
        labelZh: '大小排序',
        labelJa: 'おおきさならべ',
        icon: '📏',
        color: '#A3F5C8',
        generate: () => {
            const emojis = ['🐜', '🐱', '🐶', '🐘', '🐋'];
            const names = { zh: ['蚂蚁', '猫', '狗', '大象', '鲸鱼'], ja: ['アリ', 'ネコ', 'イヌ', 'ゾウ', 'クジラ'] };
            return emojis.map((e, i) => ({ display: e, value: i, speak: names.zh[i] }));
        },
    },
];

let currentType = null;
let rounds = [];
let currentRound = 0;
let score = 0;

// タップ選択式の状態
let correctOrder = [];
let userOrder = [];
let shuffledItems = [];

/**
 * 並べ替えゲーム画面をレンダリング
 */
export function renderSortingGame(container, navigate) {
    renderTypeSelect(container, navigate);
}

/**
 * モード選択画面
 */
function renderTypeSelect(container, navigate) {
    container.innerHTML = `
    <div class="page" id="sorting-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-sort">◀</button>
        <h1 class="page-title">${tBoth('sorting').zh}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content page-content--scrollable">
        <div class="kanji-cat-grid">
          ${SORT_TYPES.map((st, i) => `
            <button class="home-card kanji-cat-card" data-type="${i}"
                    style="background: ${st.color}; animation: popIn 0.5s ease ${i * 0.1}s both;">
              <span class="home-card__icon">${st.icon}</span>
              <span class="home-card__label">${st.labelZh}</span>
              <span class="home-card__label-sub">${st.labelJa}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

    container.querySelector('#btn-back-sort').addEventListener('click', () => {
        playSound('pop');
        navigate('home');
    });

    container.querySelectorAll('.kanji-cat-card').forEach(btn => {
        btn.addEventListener('click', () => {
            currentType = SORT_TYPES[parseInt(btn.dataset.type)];
            playSound('chime');
            startGame(container, navigate);
        });
    });
}

function startGame(container, navigate) {
    rounds = [];
    currentRound = 0;
    score = 0;
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
        rounds.push(currentType.generate());
    }
    renderRound(container, navigate);
}

function renderRound(container, navigate) {
    const items = rounds[currentRound];
    correctOrder = items.map((_, i) => i);
    userOrder = [];

    // シャッフル
    shuffledItems = [...items];
    for (let i = shuffledItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledItems[i], shuffledItems[j]] = [shuffledItems[j], shuffledItems[i]];
    }

    // 進捗
    const progress = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
        if (i < currentRound) return '<span class="math-progress__star math-progress__star--done">⭐</span>';
        if (i === currentRound) return '<span class="math-progress__star math-progress__star--current">🔵</span>';
        return '<span class="math-progress__star">⚪</span>';
    }).join('');

    const instructZh = '按正确顺序点击！';
    const instructJa = 'ただしいじゅんばんにタップ！';

    renderBoard(container, navigate, progress, instructZh, instructJa);
}

function renderBoard(container, navigate, progress, instructZh, instructJa) {
    container.innerHTML = `
    <div class="page" id="sorting-round-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-sort-round">◀</button>
        <h1 class="page-title">${currentType.labelZh} ${currentRound + 1}/${TOTAL_ROUNDS}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content">
        <div class="math-progress" style="animation: fadeIn 0.3s ease;">${progress}</div>

        <div class="sort-instruction">${instructZh}<br><span style="font-size: var(--font-size-xs); color: var(--color-text-light);">${instructJa}</span></div>

        <!-- ユーザーが選んだ順番 -->
        <div class="sort-answer-row" id="sort-answer">
          ${correctOrder.map((_, i) => `
            <div class="sort-answer-slot" data-slot="${i}">
              ${userOrder[i] !== undefined ? `<span class="sort-answer-text">${shuffledItems[userOrder[i]].display}</span>` : `<span class="sort-answer-placeholder">${i + 1}</span>`}
            </div>
          `).join('')}
        </div>

        <!-- シャッフルされた選択肢 -->
        <div class="sort-choices" id="sort-choices">
          ${shuffledItems.map((item, i) => {
        const isUsed = userOrder.includes(i);
        return `
              <button class="sort-choice ${isUsed ? 'sort-choice--used' : ''}" data-idx="${i}"
                      style="animation: popIn 0.3s ease ${i * 0.06}s both;"
                      ${isUsed ? 'disabled' : ''}>
                ${item.display}
              </button>
            `;
    }).join('')}
        </div>
      </div>
    </div>
  `;

    // 戻る
    container.querySelector('#btn-back-sort-round').addEventListener('click', () => {
        playSound('pop');
        renderTypeSelect(container, navigate);
    });

    // 選択肢クリック
    container.querySelectorAll('.sort-choice:not(.sort-choice--used)').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            handleSelect(container, navigate, idx);
        });
    });
}

function handleSelect(container, navigate, idx) {
    userOrder.push(idx);
    playSound('pop');
    speak(shuffledItems[idx].speak, currentType.id === 'hiragana' ? 'ja' : 'zh');

    // 全て選んだか確認
    if (userOrder.length === shuffledItems.length) {
        // 正解判定
        const isCorrect = userOrder.every((selectedIdx, position) => {
            return shuffledItems[selectedIdx].value === correctOrder[position];
        });

        if (isCorrect) {
            score++;
            playSound('chime');
        } else {
            playSound('pop');
        }

        setTimeout(() => {
            currentRound++;
            if (currentRound >= TOTAL_ROUNDS) {
                recordGame('sorting-game', score, TOTAL_ROUNDS);
                renderResult(container, navigate);
            } else {
                renderRound(container, navigate);
            }
        }, isCorrect ? 1200 : 1800);
        return;
    }

    // ボードを再描画
    const progress = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
        if (i < currentRound) return '<span class="math-progress__star math-progress__star--done">⭐</span>';
        if (i === currentRound) return '<span class="math-progress__star math-progress__star--current">🔵</span>';
        return '<span class="math-progress__star">⚪</span>';
    }).join('');
    renderBoard(container, navigate, progress, '按正确顺序点击！', 'ただしいじゅんばんにタップ！');
}

function renderResult(container, navigate) {
    const stars = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
        i < score ? '⭐' : '☆'
    ).join('');

    const msg = score >= 5
        ? { zh: '太棒了！完美！💯', ja: 'かんぺき！💯' }
        : score >= 3
            ? { zh: '做得很好！🎉', ja: 'よくできました！🎉' }
            : { zh: '加油！再来一次！😊', ja: 'がんばったね！😊' };

    container.innerHTML = `
    <div class="page" id="sort-result-page">
      <div class="page-header">
        <div style="width:44px"></div>
        <h1 class="page-title">${tBoth('sorting').zh}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content">
        <div class="math-result" style="animation: popIn 0.6s ease both;">
          <div class="math-result__stars">${stars}</div>
          <div class="math-result__score">${score} / ${TOTAL_ROUNDS}</div>
          <div class="math-result__message">${msg.zh}<br><span style="font-size: var(--font-size-sm); color: var(--color-text-light);">${msg.ja}</span></div>
        </div>
        <div class="math-result__actions" style="animation: slideUp 0.5s ease 0.3s both;">
          <button class="math-result__btn math-result__btn--retry" id="btn-sort-retry">
            ${tBoth('mathRetry').zh}
          </button>
          <button class="math-result__btn math-result__btn--home" id="btn-sort-home">
            ${tBoth('back').zh}
          </button>
        </div>
      </div>
    </div>
  `;

    setTimeout(() => speak(msg.zh, 'zh'), 600);

    container.querySelector('#btn-sort-retry').addEventListener('click', () => {
        playSound('chime');
        renderTypeSelect(container, navigate);
    });

    container.querySelector('#btn-sort-home').addEventListener('click', () => {
        playSound('pop');
        navigate('home');
    });
}
