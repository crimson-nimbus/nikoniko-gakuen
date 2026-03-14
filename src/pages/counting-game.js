/**
 * counting-game.js — かぞえるゲーム
 * 画面に表示されるアイテムを数えて正解の数字を選ぶ
 * 対象: 3-4歳 / 範囲: 1〜10
 * 5問1セット → スコア画面
 */
import { t, tBoth, getLang } from '../i18n.js';
import { playSound, speak, speakWord, speakUI } from '../audio.js';
import { recordGame } from '../progress.js';

const TOTAL_QUESTIONS = 5;

/** かわいい絵文字プール */
const EMOJI_POOL = [
  '🍎', '🍊', '🍋', '🍓', '🍇', '🍌', '🍉', '🍑',
  '🌸', '🌻', '⭐', '🌙', '❤️', '🎈', '🦋', '🐟',
  '🐶', '🐱', '🐰', '🐼', '🐸', '🦁', '🐘', '🐦',
];

let questions = [];
let currentQ = 0;
let score = 0;
let answered = false;

/** 音声言語（中国語デフォルト） */
let voiceLang = 'zh';

/**
 * かぞえるゲーム画面をレンダリング
 */
export function renderCountingGame(container, navigate) {
  const appLang = getLang();
  voiceLang = appLang === 'ja' ? 'ja' : 'zh';
  startGame(container, navigate);
}

/**
 * 問題を生成
 */
function generateQuestion() {
  const count = 1 + Math.floor(Math.random() * 10); // 1〜10
  const emoji = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];

  // 不正解の選択肢（正解の前後）
  const wrongs = new Set();
  while (wrongs.size < 2) {
    let w = count + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2));
    if (w < 1) w = count + 1 + Math.floor(Math.random() * 2);
    if (w > 12) w = count - 1 - Math.floor(Math.random() * 2);
    if (w !== count && w >= 1) wrongs.add(w);
  }

  const choices = [count, ...wrongs];
  // シャッフル
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { count, emoji, choices };
}

function startGame(container, navigate) {
  questions = [];
  currentQ = 0;
  score = 0;
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    questions.push(generateQuestion());
  }
  renderQuestion(container, navigate);
}

/**
 * 数字の読み上げテキスト
 */
function numberSpeakText(n) {
  const zhNums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const jaNums = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];
  if (voiceLang === 'zh') return zhNums[n] || String(n);
  return jaNums[n] || String(n);
}

function renderQuestion(container, navigate) {
  answered = false;
  const q = questions[currentQ];

  // 進捗
  const progress = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
    if (i < currentQ) return '<span class="math-progress__star math-progress__star--done">⭐</span>';
    if (i === currentQ) return '<span class="math-progress__star math-progress__star--current">🔵</span>';
    return '<span class="math-progress__star">⚪</span>';
  }).join('');

  // アイテムをランダムに配置（グリッドの中にバラバラに表示）
  const items = Array.from({ length: q.count }, (_, i) => {
    const delay = i * 0.08;
    return `<span class="count-item" style="animation: popIn 0.4s ease ${delay}s both; font-size: clamp(1.8rem, 6vw, 2.8rem);">${q.emoji}</span>`;
  }).join('');

  const questionZh = '数一数，有几个？';
  const questionJa = 'いくつあるかな？';

  container.innerHTML = `
    <div class="page" id="counting-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-count">◀</button>
        <h1 class="page-title">${tBoth('counting').zh}</h1>
        <button class="btn-back math-lang-toggle" id="btn-lang-count"
                style="font-size: 1.1rem; min-width: 44px;">
          ${voiceLang === 'zh' ? '🇨🇳' : '🇯🇵'}
        </button>
      </div>

      <div class="page-content">
        <!-- 進捗 -->
        <div class="math-progress" style="animation: fadeIn 0.3s ease;">
          ${progress}
        </div>

        <!-- 質問テキスト -->
        <div class="count-question-text" style="animation: fadeIn 0.5s ease;">
          ${voiceLang === 'zh' ? questionZh : questionJa}
        </div>

        <!-- アイテム表示エリア -->
        <div class="count-area" id="count-area">
          ${items}
        </div>

        <!-- 選択肢 -->
        <div class="math-choices" id="count-choices">
          ${q.choices.map((c, i) => `
            <button class="math-choice count-choice" data-value="${c}"
                    style="animation: popIn 0.4s ease ${0.3 + i * 0.1}s both; font-size: var(--font-size-xl);">
              ${c}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // 戻る
  container.querySelector('#btn-back-count').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });

  // 言語トグル
  container.querySelector('#btn-lang-count').addEventListener('click', () => {
    voiceLang = voiceLang === 'zh' ? 'ja' : 'zh';
    playSound('pop');
    renderQuestion(container, navigate);
  });

  // 選択肢クリック
  container.querySelectorAll('.count-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const val = parseInt(btn.dataset.value);
      handleAnswer(container, navigate, val, btn);
    });
  });

  // 質問読み上げ（MP3優先）
  setTimeout(() => {
    speakUI('howmany', voiceLang === 'zh' ? questionZh : questionJa, voiceLang);
  }, 600);
}

function handleAnswer(container, navigate, value, btnEl) {
  const q = questions[currentQ];
  const isCorrect = value === q.count;

  if (isCorrect) {
    score++;
    btnEl.classList.add('math-choice--correct');
    playSound('chime');

    // 正解の数をMP3ファイルで読み上げ（numbers カテゴリと共用）
    setTimeout(() => speakWord('numbers', String(q.count), numberSpeakText(q.count), voiceLang), 300);

    // 紙吹雪
    showConfetti(container);
  } else {
    btnEl.classList.add('math-choice--wrong');
    playSound('pop');

    container.querySelectorAll('.count-choice').forEach(b => {
      if (parseInt(b.dataset.value) === q.count) {
        b.classList.add('math-choice--correct');
      }
    });
  }

  setTimeout(() => {
    currentQ++;
    if (currentQ >= TOTAL_QUESTIONS) {
      recordGame('counting-game', score, TOTAL_QUESTIONS);
      renderResult(container, navigate);
    } else {
      renderQuestion(container, navigate);
    }
  }, isCorrect ? 1500 : 2000);
}

function showConfetti(container) {
  const wrap = document.createElement('div');
  wrap.className = 'math-confetti';
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'];
  for (let i = 0; i < 20; i++) {
    const piece = document.createElement('div');
    piece.className = 'math-confetti__piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.animationDuration = `${0.8 + Math.random() * 0.5}s`;
    wrap.appendChild(piece);
  }
  const page = container.querySelector('.page');
  if (page) {
    page.appendChild(wrap);
    setTimeout(() => wrap.remove(), 1500);
  }
}

function renderResult(container, navigate) {
  const stars = Array.from({ length: TOTAL_QUESTIONS }, (_, i) =>
    i < score ? '⭐' : '☆'
  ).join('');

  const messages = {
    5: { ja: 'すごーい！💯', zh: '太棒了！💯' },
    4: { ja: 'よくできました！🎉', zh: '做得很好！🎉' },
    3: { ja: 'がんばったね！😊', zh: '加油！😊' },
    2: { ja: 'もうすこし！💪', zh: '再加油！💪' },
    1: { ja: 'つぎもがんばろう！🌟', zh: '下次加油！🌟' },
    0: { ja: 'つぎもがんばろう！🌟', zh: '下次加油！🌟' },
  };

  const msg = messages[score] || messages[0];

  container.innerHTML = `
    <div class="page" id="count-result-page">
      <div class="page-header">
        <div style="width:44px"></div>
        <h1 class="page-title">${tBoth('counting').zh}</h1>
        <div style="width:44px"></div>
      </div>
      <div class="page-content">
        <div class="math-result" style="animation: popIn 0.6s ease both;">
          <div class="math-result__stars">${stars}</div>
          <div class="math-result__score">${score} / ${TOTAL_QUESTIONS}</div>
          <div class="math-result__message">${msg[voiceLang]}</div>
        </div>
        <div class="math-result__actions" style="animation: slideUp 0.5s ease 0.3s both;">
          <button class="math-result__btn math-result__btn--retry" id="btn-count-retry">
            ${tBoth('mathRetry')[voiceLang]}
          </button>
          <button class="math-result__btn math-result__btn--home" id="btn-count-home">
            ${tBoth('back')[voiceLang]}
          </button>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const uiKey = score >= 5 ? 'perfect' : score >= 4 ? 'great' : 'tryagain';
    speakUI(uiKey, msg[voiceLang], voiceLang);
  }, 800);

  container.querySelector('#btn-count-retry').addEventListener('click', () => {
    playSound('chime');
    startGame(container, navigate);
  });

  container.querySelector('#btn-count-home').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });
}
