/**
 * parent-dashboard.js — 保護者ダッシュボード
 * 子供の学習進捗・統計・バッジを表示
 */
import { tBoth } from '../i18n.js';
import { playSound } from '../audio.js';
import { getProgress, getEarnedBadges, getAllBadges, getGameStats } from '../progress.js';

const GAME_LABELS = {
    'math-game': { zh: '算术', ja: 'けいさん', icon: '🧮' },
    'counting-game': { zh: '数一数', ja: 'かぞえる', icon: '🔢' },
    'memory-game': { zh: '记忆', ja: 'きおく', icon: '🎴' },
    'sorting-game': { zh: '排序', ja: 'ならべかえ', icon: '📏' },
};

/**
 * 保護者ダッシュボードをレンダリング
 */
export function renderParentDashboard(container, navigate) {
    const progress = getProgress();
    const earned = getEarnedBadges();
    const allBadges = getAllBadges();

    // ゲーム統計
    const gameIds = Object.keys(GAME_LABELS);
    const gameStatsHtml = gameIds.map(id => {
        const stats = getGameStats(id);
        const label = GAME_LABELS[id];
        const avg = stats.played > 0 ? Math.round(stats.totalScore / stats.played * 10) / 10 : 0;
        return `
      <div class="dash-stat-card" style="animation: slideUp 0.4s ease both;">
        <div class="dash-stat-card__icon">${label.icon}</div>
        <div class="dash-stat-card__title">${label.zh}<br><span style="font-size: var(--font-size-xs); color: var(--color-text-light);">${label.ja}</span></div>
        <div class="dash-stat-card__data">
          <div class="dash-stat-item">
            <span class="dash-stat-item__value">${stats.played}</span>
            <span class="dash-stat-item__label">游玩次数</span>
          </div>
          <div class="dash-stat-item">
            <span class="dash-stat-item__value">${stats.bestScore}</span>
            <span class="dash-stat-item__label">最高分</span>
          </div>
          <div class="dash-stat-item">
            <span class="dash-stat-item__value">${avg}</span>
            <span class="dash-stat-item__label">平均分</span>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // バッジ
    const badgesHtml = allBadges.map(badge => {
        const isEarned = earned.some(e => e.id === badge.id);
        return `
      <div class="dash-badge ${isEarned ? 'dash-badge--earned' : 'dash-badge--locked'}">
        <span class="dash-badge__icon">${isEarned ? badge.icon : '🔒'}</span>
        <span class="dash-badge__name">${badge.nameZh}<br><span style="font-size: var(--font-size-xs);">${badge.nameJa}</span></span>
      </div>
    `;
    }).join('');

    container.innerHTML = `
    <div class="page" id="dashboard-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-dash">◀</button>
        <h1 class="page-title">${tBoth('dashboard').zh}</h1>
        <div style="width:44px"></div>
      </div>

      <div class="page-content page-content--scrollable">
        <!-- 総合統計 -->
        <div class="dash-summary" style="animation: popIn 0.5s ease both;">
          <div class="dash-summary__item">
            <span class="dash-summary__value">🔥 ${progress.currentStreak || 0}</span>
            <span class="dash-summary__label">连续天数<br>れんぞく</span>
          </div>
          <div class="dash-summary__item">
            <span class="dash-summary__value">💯 ${progress.perfectScores || 0}</span>
            <span class="dash-summary__label">满分次数<br>まんてん</span>
          </div>
          <div class="dash-summary__item">
            <span class="dash-summary__value">字 ${progress.kanjiViewed || 0}</span>
            <span class="dash-summary__label">汉字学习<br>かんじ</span>
          </div>
        </div>

        <!-- バッジ -->
        <h2 class="dash-section-title">🏆 奖章 / バッジ</h2>
        <div class="dash-badge-grid">
          ${badgesHtml}
        </div>

        <!-- ゲーム別統計 -->
        <h2 class="dash-section-title">📊 游戏统计 / ゲームとうけい</h2>
        <div class="dash-stats-grid">
          ${gameStatsHtml}
        </div>

        <!-- データリセット -->
        <div class="dash-reset" style="margin-top: var(--space-xl);">
          <button class="dash-reset-btn" id="btn-reset-data">🗑 重置数据 / データリセット</button>
        </div>
      </div>
    </div>
  `;

    // 戻る
    container.querySelector('#btn-back-dash').addEventListener('click', () => {
        playSound('pop');
        navigate('home');
    });

    // データリセット
    container.querySelector('#btn-reset-data').addEventListener('click', () => {
        if (confirm('確定要重置所有数据吗？\nすべてのデータをリセットしますか？')) {
            localStorage.removeItem('nikoniko_progress');
            playSound('pop');
            renderParentDashboard(container, navigate);
        }
    });
}
