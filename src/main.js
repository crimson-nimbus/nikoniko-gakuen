/**
 * main.js — アプリケーション エントリーポイント
 * SPA風ルーティングで画面を切り替え
 */
import './styles/index.css';
import { renderHome } from './pages/home.js';
import { renderFlashcards } from './pages/flashcards.js';
import { renderTouchPlay } from './pages/touch-play.js';
import { renderVideos } from './pages/videos.js';
import { renderMusic } from './pages/music.js';
import { renderSettings } from './pages/settings.js';
import { renderHiragana } from './pages/hiragana.js';
import { renderMathGame } from './pages/math-game.js';
import { renderPinyin } from './pages/pinyin.js';
import { renderKatakana } from './pages/katakana.js';
import { renderMemoryGame } from './pages/memory-game.js';
import { renderCountingGame } from './pages/counting-game.js';
import { renderKanjiIntro } from './pages/kanji-intro.js';
import { renderSortingGame } from './pages/sorting-game.js';
import { renderParentDashboard } from './pages/parent-dashboard.js';
import { initAudio } from './audio.js';

const app = document.getElementById('app');

/** 現在のページ */
let currentPage = 'home';

/** ページレンダラーのマッピング */
const pages = {
    home: renderHome,
    flashcards: renderFlashcards,
    'touch-play': renderTouchPlay,
    videos: renderVideos,
    music: renderMusic,
    settings: renderSettings,
    hiragana: renderHiragana,
    'math-game': renderMathGame,
    pinyin: renderPinyin,
    katakana: renderKatakana,
    'memory-game': renderMemoryGame,
    'counting-game': renderCountingGame,
    'kanji-intro': renderKanjiIntro,
    'sorting-game': renderSortingGame,
    'parent-dashboard': renderParentDashboard,
};

/**
 * ページ遷移
 * @param {string} page
 */
function navigate(page) {
    if (!pages[page]) {
        console.warn(`Unknown page: ${page}`);
        page = 'home';
    }
    currentPage = page;
    pages[page](app, navigate);
}

// 初回レンダリング
navigate('home');

// 最初のタッチで AudioContext を初期化
document.addEventListener(
    'touchstart',
    () => {
        initAudio();
    },
    { once: true }
);

document.addEventListener(
    'click',
    () => {
        initAudio();
    },
    { once: true }
);

// ダブルタップでのズームを防止
let lastTouchEnd = 0;
document.addEventListener(
    'touchend',
    (e) => {
        const now = Date.now();
        if (now - lastTouchEnd < 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    },
    { passive: false }
);

// コンテキストメニューを無効化（誤操作防止）
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
