/**
 * katakana.js — カタカナ50音表ページ
 * ひらがなページと同じUI構成
 * タップすると音声読み上げ + バウンスアニメーション
 * 清音 / 濁音・半濁音 タブ切替
 */
import { t, getLang } from '../i18n.js';
import { playSound, speak } from '../audio.js';

/** 清音データ（行ごとに配列） */
const SEION_ROWS = [
    { label: 'ア行', color: '#FFB3B3', chars: ['ア', 'イ', 'ウ', 'エ', 'オ'] },
    { label: 'カ行', color: '#FFD1A3', chars: ['カ', 'キ', 'ク', 'ケ', 'コ'] },
    { label: 'サ行', color: '#FFE8A3', chars: ['サ', 'シ', 'ス', 'セ', 'ソ'] },
    { label: 'タ行', color: '#D4F5A3', chars: ['タ', 'チ', 'ツ', 'テ', 'ト'] },
    { label: 'ナ行', color: '#A3F5C8', chars: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'] },
    { label: 'ハ行', color: '#A3E8F5', chars: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'] },
    { label: 'マ行', color: '#A3C8F5', chars: ['マ', 'ミ', 'ム', 'メ', 'モ'] },
    { label: 'ヤ行', color: '#C8A3F5', chars: ['ヤ', null, 'ユ', null, 'ヨ'] },
    { label: 'ラ行', color: '#F5A3D8', chars: ['ラ', 'リ', 'ル', 'レ', 'ロ'] },
    { label: 'ワ行', color: '#F5A3A3', chars: ['ワ', null, null, null, 'ヲ'] },
    { label: 'ン', color: '#D8C8B8', chars: ['ン', null, null, null, null] },
];

/** 濁音・半濁音データ */
const DAKUON_ROWS = [
    { label: 'ガ行', color: '#FFD1A3', chars: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'] },
    { label: 'ザ行', color: '#FFE8A3', chars: ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'] },
    { label: 'ダ行', color: '#D4F5A3', chars: ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'] },
    { label: 'バ行', color: '#A3E8F5', chars: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'] },
    { label: 'パ行', color: '#C8A3F5', chars: ['パ', 'ピ', 'プ', 'ペ', 'ポ'] },
];

/** ローマ字マッピング（中国語モード用） */
const ROMAJI = {
    'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
    'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
    'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
    'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
    'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
    'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
    'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
    'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
    'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
    'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
    'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
    'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
    'ダ': 'da', 'ヂ': 'di', 'ヅ': 'du', 'デ': 'de', 'ド': 'do',
    'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
    'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
};

/** 現在のタブ */
let currentTab = 'seion';

/**
 * カタカナページをレンダリング
 */
export function renderKatakana(container, navigate) {
    renderGrid(container, navigate);
}

function renderGrid(container, navigate) {
    const rows = currentTab === 'seion' ? SEION_ROWS : DAKUON_ROWS;
    const lang = getLang();
    const showRomaji = lang === 'zh' || lang === 'both';

    container.innerHTML = `
    <div class="page" id="katakana-page">
      <div class="page-header">
        <button class="btn-back" id="btn-back-kata">◀</button>
        <h1 class="page-title">${t('katakana')}</h1>
        <div style="width:44px"></div>
      </div>

      <!-- タブ切替 -->
      <div class="hira-tabs">
        <button class="hira-tab ${currentTab === 'seion' ? 'active' : ''}" data-tab="seion">
          ${t('seion')}
        </button>
        <button class="hira-tab ${currentTab === 'dakuon' ? 'active' : ''}" data-tab="dakuon">
          ${t('dakuon')}
        </button>
      </div>

      <div class="page-content page-content--scrollable">
        <div class="hira-grid-wrap">
          ${rows.map((row, rowIdx) => `
            <div class="hira-row" style="animation: slideUp 0.4s ease ${rowIdx * 0.05}s both;">
              ${row.chars.map(ch => {
        if (!ch) return '<div class="hira-cell hira-cell--empty"></div>';
        return `
                  <button class="hira-cell" data-char="${ch}"
                          style="background: ${row.color};">
                    <span class="hira-cell__char">${ch}</span>
                    ${showRomaji ? `<span class="hira-cell__romaji">${ROMAJI[ch] || ''}</span>` : ''}
                  </button>
                `;
    }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

    // 戻るボタン
    container.querySelector('#btn-back-kata').addEventListener('click', () => {
        playSound('pop');
        navigate('home');
    });

    // タブ切替
    container.querySelectorAll('.hira-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentTab = tab.dataset.tab;
            playSound('pop');
            renderGrid(container, navigate);
        });
    });

    // セルタップ — 読み上げ
    container.querySelectorAll('.hira-cell[data-char]').forEach(cell => {
        cell.addEventListener('click', async () => {
            const ch = cell.dataset.char;
            cell.classList.add('hira-cell--bounce');
            playSound('sparkle');
            await speak(ch, 'ja');
            setTimeout(() => cell.classList.remove('hira-cell--bounce'), 500);
        });
    });
}
