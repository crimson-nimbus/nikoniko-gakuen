/**
 * i18n — バイリンガル（日本語 / 中国語）データ管理
 */

const LANG_KEY = 'nikoniko-lang';
const AGE_KEY = 'nikoniko-age';

/** @type {'ja' | 'zh' | 'both'} */
let currentLang = localStorage.getItem(LANG_KEY) || 'both';

/** @type {'1-2' | '3-4' | '5-6'} */
let currentAge = localStorage.getItem(AGE_KEY) || '1-2';

/** UI文言 */
const messages = {
    ja: {
        appName: 'にこにこ学園',
        flashcards: 'フラッシュカード',
        touchPlay: 'タッチあそび',
        videos: 'どうが',
        music: 'おんがく',
        settings: 'せってい',
        back: 'もどる',
        // フラッシュカードカテゴリ
        animals: 'どうぶつ',
        fruits: 'くだもの',
        colors: 'いろ',
        numbers: 'すうじ',
        vehicles: 'のりもの',
        shapes: 'かたち',
        body: 'からだ',
        food: 'たべもの',
        weather: 'てんき',
        greetings: 'あいさつ',
        family: 'かぞく',
        seasons: 'きせつ',
        // タッチ遊びモード
        fireworks: 'はなび',
        bubbles: 'しゃぼんだま',
        stars: 'きらきらぼし',
        drawing: 'おえかき',
        rainbow: 'にじつくり',
        numberTouch: 'かずタッチ',
        // 設定
        language: 'ことば',
        langJa: 'にほんご',
        langZh: 'ちゅうごくご',
        langBoth: 'りょうほう',
        speech: 'こえをだす',
        timer: 'タイマー',
        timerOff: 'オフ',
        timerEnd: 'おしまいだよ！\nまたあそぼうね 🌙',
        of: '/',
        // 年齢
        ageGroup: 'ねんれい',
        age12: '1-2さい',
        age34: '3-4さい',
        age56: '5-6さい',
        // おえかき
        drawClear: 'ぜんぶけす',
        drawThick: 'ふとい',
        drawThin: 'ほそい',
        // ひらがな
        hiragana: 'ひらがな',
        seion: 'せいおん',
        dakuon: 'だくおん',
        // けいさん
        math: 'けいさん',
        mathResult: 'けっか',
        mathRetry: 'もういっかい',
        // ピンイン
        pinyin: 'ピンイン',
        shengmu: 'しせいぼ',
        yunmu: 'いんぼ',
        // カタカナ
        katakana: 'カタカナ',
        // 記憶ゲーム
        memory: 'きおくゲーム',
    },
    zh: {
        appName: '笑笑学园',
        flashcards: '闪卡',
        touchPlay: '触摸游戏',
        videos: '视频',
        music: '音乐',
        settings: '设置',
        back: '返回',
        // フラッシュカードカテゴリ
        animals: '动物',
        fruits: '水果',
        colors: '颜色',
        numbers: '数字',
        vehicles: '交通工具',
        shapes: '形状',
        body: '身体',
        food: '食物',
        weather: '天气',
        greetings: '打招呼',
        family: '家人',
        seasons: '季节',
        // タッチ遊びモード
        fireworks: '烟花',
        bubbles: '泡泡',
        stars: '闪闪星星',
        drawing: '画画',
        rainbow: '彩虹',
        numberTouch: '数字触摸',
        // 設定
        language: '语言',
        langJa: '日语',
        langZh: '中文',
        langBoth: '双语',
        speech: '语音',
        timer: '定时器',
        timerOff: '关闭',
        timerEnd: '结束啦！\n下次再玩吧 🌙',
        of: '/',
        // 年齢
        ageGroup: '年龄',
        age12: '1-2岁',
        age34: '3-4岁',
        age56: '5-6岁',
        // おえかき
        drawClear: '全部清除',
        drawThick: '粗',
        drawThin: '细',
        // ひらがな
        hiragana: '平假名',
        seion: '清音',
        dakuon: '浊音',
        // けいさん
        math: '算术',
        mathResult: '结果',
        mathRetry: '再来一次',
        // ピンイン
        pinyin: '拼音',
        shengmu: '声母',
        yunmu: '韵母',
        // カタカナ
        katakana: '片假名',
        // 記憶ゲーム
        memory: '记忆游戏',
    },
};

/**
 * 現在の言語設定を取得
 */
export function getLang() {
    return currentLang;
}

/**
 * 言語を設定
 * @param {'ja' | 'zh' | 'both'} lang
 */
export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
}

/**
 * 現在の年齢グループを取得
 */
export function getAge() {
    return currentAge;
}

/**
 * 年齢グループを設定
 * @param {'1-2' | '3-4' | '5-6'} age
 */
export function setAge(age) {
    currentAge = age;
    localStorage.setItem(AGE_KEY, age);
}

/**
 * UI文言を取得（both の場合は ja を優先表示）
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
    const lang = currentLang === 'both' ? 'zh' : currentLang;
    return messages[lang]?.[key] || messages.zh[key] || key;
}

/**
 * 指定言語のUI文言を直接取得
 * @param {'ja' | 'zh'} lang
 * @param {string} key
 */
export function tLang(lang, key) {
    return messages[lang]?.[key] || key;
}

/**
 * 中国語+日本語の両方のテキストを返す（中国語優先バイリンガル表示用）
 * @param {string} key
 * @returns {{ zh: string, ja: string }}
 */
export function tBoth(key) {
    return {
        zh: messages.zh?.[key] || key,
        ja: messages.ja?.[key] || key,
    };
}
