/**
 * math-game.js — かんたんけいさんゲーム
 * 1桁の足し算/引き算を3択で回答する知育ゲーム
 * 5問1セット → スコア画面
 * 中国語 / 日本語 切替対応
 */
import { t, getLang } from '../i18n.js';
import { playSound, speak, speakUI } from '../audio.js';
import { recordGame } from '../progress.js';

const TOTAL_QUESTIONS = 5;

/** 音声言語（中国語優先デフォルト） */
let voiceLang = 'zh';

/**
 * 計算ゲーム画面をレンダリング
 */
export function renderMathGame(container, navigate) {
  // 初回: 言語設定に応じてデフォルトを決定
  const appLang = getLang();
  voiceLang = appLang === 'ja' ? 'ja' : 'zh'; // both→zh（中国語優先）
  startGame(container, navigate);
}

/** ゲーム状態 */
let questions = [];
let currentQ = 0;
let score = 0;
let answered = false;

/**
 * 問題を生成
 */
function generateQuestion() {
  const isAddition = Math.random() < 0.5;
  let a, b, answer;

  if (isAddition) {
    a = 1 + Math.floor(Math.random() * 8); // 1-8
    b = 1 + Math.floor(Math.random() * (9 - a)); // 答えが9以下
    answer = a + b;
  } else {
    a = 2 + Math.floor(Math.random() * 8); // 2-9
    b = 1 + Math.floor(Math.random() * (a - 1)); // 1 ≤ b < a（答え≥1）
    answer = a - b;
  }
  const operator = isAddition ? '+' : '−';
  const text = `${a} ${operator} ${b} = ?`;

  // 不正解の選択肢を生成（正解とは異なる値）
  const wrongs = new Set();
  while (wrongs.size < 2) {
    let w = answer + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
    if (w < 0) w = answer + 1 + Math.floor(Math.random() * 3);
    if (w !== answer && w >= 0) wrongs.add(w);
  }

  // 選択肢をシャッフル
  const choices = [answer, ...wrongs];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { text, answer, choices, a, b, operator };
}

/**
 * ゲーム開始
 */
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
 * 問題画面をレンダリング
 */
function renderQuestion(container, navigate) {
  answered = false;
  const q = questions[currentQ];

  // 進捗の星を表示
  const progressStars = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
    if (i < currentQ) return '<span class="math-progress__star math-progress__star--done">⭐</span>';
    if (i === currentQ) return '<span class="math-progress__star math-progress__star--current">🔵</span>';
    return '<span class="math-progress__star">⚪</span>';
  }).join('');

  container.innerHTML = `
    <div class="page" id="math-game-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-math">◀</button>
        <h1 class="page-title">${t('math')}</h1>
        <button class="btn-back math-lang-toggle" id="btn-lang-toggle"
                style="font-size: 1.1rem; min-width: 44px;">
          ${voiceLang === 'zh' ? '🇨🇳' : '🇯🇵'}
        </button>
      </div>

      <div class="page-content">
        <!-- 進捗 -->
        <div class="math-progress" style="animation: fadeIn 0.3s ease;">
          ${progressStars}
        </div>

        <!-- 問題 -->
        <div class="math-question" id="math-question" style="animation: popIn 0.5s ease both;">
          <span class="math-question__text">${q.text}</span>
        </div>

        <!-- 選択肢 -->
        <div class="math-choices" id="math-choices">
          ${q.choices.map((c, i) => `
            <button class="math-choice" data-value="${c}"
                    style="animation: popIn 0.4s ease ${0.2 + i * 0.1}s both;">
              ${c}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // 戻るボタン
  container.querySelector('#btn-back-math').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });

  // 言語トグル
  container.querySelector('#btn-lang-toggle').addEventListener('click', () => {
    voiceLang = voiceLang === 'zh' ? 'ja' : 'zh';
    playSound('pop');
    renderQuestion(container, navigate);
  });

  // 選択肢クリック
  container.querySelectorAll('.math-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const val = parseInt(btn.dataset.value);
      handleAnswer(container, navigate, val, btn);
    });
  });

  // 問題を読み上げ
  setTimeout(() => {
    if (voiceLang === 'zh') {
      const zhText = `${q.a} ${q.operator === '+' ? '加' : '减'} ${q.b} 等于几？`;
      speak(zhText, 'zh');
    } else {
      const jaNum = (n) => ['ゼロ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう',
        'じゅういち', 'じゅうに', 'じゅうさん', 'じゅうよん', 'じゅうご', 'じゅうろく', 'じゅうなな', 'じゅうはち'][n] || String(n);
      const jaText = `${jaNum(q.a)} ${q.operator === '+' ? 'たす' : 'ひく'} ${jaNum(q.b)} は？`;
      speak(jaText, 'ja');
    }
  }, 600);
}

/**
 * 回答処理
 */
function handleAnswer(container, navigate, value, btnEl) {
  const q = questions[currentQ];
  const isCorrect = value === q.answer;

  if (isCorrect) {
    score++;
    btnEl.classList.add('math-choice--correct');
    playSound('chime');

    // 紙吹雪エフェクト
    showConfetti(container);
  } else {
    btnEl.classList.add('math-choice--wrong');
    playSound('pop');

    // 正解を表示
    container.querySelectorAll('.math-choice').forEach(b => {
      if (parseInt(b.dataset.value) === q.answer) {
        b.classList.add('math-choice--correct');
      }
    });
  }

  // 次の問題へ
  setTimeout(() => {
    currentQ++;
    if (currentQ >= TOTAL_QUESTIONS) {
      recordGame('math-game', score, TOTAL_QUESTIONS);
      renderResult(container, navigate);
    } else {
      renderQuestion(container, navigate);
    }
  }, isCorrect ? 1500 : 2000);
}

/**
 * 紙吹雪エフェクト
 */
function showConfetti(container) {
  const confettiWrap = document.createElement('div');
  confettiWrap.className = 'math-confetti';
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'];

  for (let i = 0; i < 20; i++) {
    const piece = document.createElement('div');
    piece.className = 'math-confetti__piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.animationDuration = `${0.8 + Math.random() * 0.5}s`;
    confettiWrap.appendChild(piece);
  }

  const page = container.querySelector('.page');
  if (page) {
    page.appendChild(confettiWrap);
    setTimeout(() => confettiWrap.remove(), 1500);
  }
}

/**
 * 結果画面をレンダリング
 */
function renderResult(container, navigate) {
  const stars = Array.from({ length: TOTAL_QUESTIONS }, (_, i) =>
    i < score ? '⭐' : '☆'
  ).join('');

  const messages = {
    5: { ja: 'すごーい！ 💯', zh: '太棒了！💯' },
    4: { ja: 'よくできました！ 🎉', zh: '做得很好！🎉' },
    3: { ja: 'がんばったね！ 😊', zh: '加油！😊' },
    2: { ja: 'もうすこし！ 💪', zh: '再加油！💪' },
    1: { ja: 'つぎもがんばろう！ 🌟', zh: '下次加油！🌟' },
    0: { ja: 'つぎもがんばろう！ 🌟', zh: '下次加油！🌟' },
  };

  const msg = messages[score] || messages[0];

  container.innerHTML = `
    <div class="page" id="math-result-page">
      <div class="page-header">
        <div style="width:44px"></div>
        <h1 class="page-title">${t('mathResult')}</h1>
        <div style="width:44px"></div>
      </div>

      <div class="page-content">
        <div class="math-result" style="animation: popIn 0.6s ease both;">
          <div class="math-result__stars">${stars}</div>
          <div class="math-result__score">${score} / ${TOTAL_QUESTIONS}</div>
          <div class="math-result__message">${msg[voiceLang]}</div>
        </div>

        <div class="math-result__actions" style="animation: slideUp 0.5s ease 0.3s both;">
          <button class="math-result__btn math-result__btn--retry" id="btn-retry">
            ${t('mathRetry')}
          </button>
          <button class="math-result__btn math-result__btn--home" id="btn-home-math">
            ${t('back')}
          </button>
        </div>
      </div>
    </div>
  `;

  // 結果読み上げ（MP3優先）
  setTimeout(() => {
    const uiKey = score >= 5 ? 'perfect' : score >= 4 ? 'great' : 'tryagain';
    speakUI(uiKey, msg[voiceLang], voiceLang);
  }, 800);

  // もう一回
  container.querySelector('#btn-retry').addEventListener('click', () => {
    playSound('chime');
    startGame(container, navigate);
  });

  // ホームに戻る
  container.querySelector('#btn-home-math').addEventListener('click', () => {
    playSound('pop');
    navigate('home');
  });
}
