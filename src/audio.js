/**
 * audio.js — 音声管理モジュール
 * Web Speech API + Web Audio API で読み上げと効果音を提供
 */

const SPEECH_KEY = 'nikoniko-speech';
let speechEnabled = localStorage.getItem(SPEECH_KEY) !== 'false';

/** AudioContext (遅延初期化) */
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

/**
 * 音声読み上げの有効/無効を取得
 */
export function isSpeechEnabled() {
    return speechEnabled;
}

/**
 * 音声読み上げの有効/無効を設定
 */
export function setSpeechEnabled(enabled) {
    speechEnabled = enabled;
    localStorage.setItem(SPEECH_KEY, enabled ? 'true' : 'false');
}

/**
 * 利用可能な音声リストをキャッシュ
 */
let cachedVoices = [];
function loadVoices() {
    cachedVoices = window.speechSynthesis?.getVoices() || [];
}
if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * 指定言語に最適な音声を選択
 * iOS/Safariでは音声名にプラットフォーム固有の名前がつくため、
 * 言語コードで検索して最適なものを返す
 */
function findBestVoice(langCode) {
    if (cachedVoices.length === 0) loadVoices();

    // 完全一致を優先
    let voice = cachedVoices.find(v => v.lang === langCode);
    if (voice) return voice;

    // プレフィックス一致 (例: 'zh-CN' → 'zh' で検索)
    const prefix = langCode.split('-')[0];
    voice = cachedVoices.find(v => v.lang.startsWith(prefix));
    if (voice) return voice;

    // 中国語のフォールバック: zh-CN → zh-TW → zh-HK
    if (prefix === 'zh') {
        voice = cachedVoices.find(v =>
            v.lang === 'zh-TW' || v.lang === 'zh-HK' ||
            v.lang.startsWith('zh')
        );
        if (voice) return voice;
    }

    return null;
}

/**
 * テキストを音声で読み上げ
 * Web Speech API 非対応の環境（WeChat内ブラウザ等）では
 * サイレントに失敗し、視覚的フィードバックでカバー
 * @param {string} text - 読み上げるテキスト
 * @param {'ja' | 'zh'} lang - 言語
 * @returns {Promise<void>}
 */
export function speak(text, lang = 'ja') {
    if (!speechEnabled) return Promise.resolve();

    // Web Speech API 非対応のフォールバック（WeChat内ブラウザ等）
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        // 既存の読み上げを停止
        window.speechSynthesis.cancel();

        const langCode = lang === 'zh' ? 'zh-CN' : 'ja-JP';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCode;
        utterance.rate = 0.8; // ゆっくり話す（子供向け）
        utterance.pitch = 1.1; // やや高めの声
        utterance.volume = 0.8;

        // 最適な音声を明示的に設定（iOS/Safari対応）
        const voice = findBestVoice(langCode);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang; // 音声の実際の言語コードに合わせる
        }

        utterance.onend = resolve;
        utterance.onerror = () => resolve(); // エラー時もサイレントに解決

        // iOS Safariではcancel後に長めの遅延が必要
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const delay = isIOS ? 200 : 50;

        setTimeout(() => {
            try {
                window.speechSynthesis.speak(utterance);
                // iOS Safari: 長い発話が途中で止まるバグ対策
                if (isIOS) {
                    const keepAlive = setInterval(() => {
                        if (!window.speechSynthesis.speaking) {
                            clearInterval(keepAlive);
                        } else {
                            window.speechSynthesis.pause();
                            window.speechSynthesis.resume();
                        }
                    }, 5000);
                }
            } catch (e) {
                resolve();
            }
        }, delay);
    });
}


/**
 * 生成済みMP3ファイルで単語を読み上げ
 * ファイルが見つからない場合はWeb Speech APIにフォールバック
 * 
 * @param {string} category - フラッシュカードカテゴリ (e.g. 'animals')
 * @param {string} fileKey  - ファイル名（拡張子なし） (e.g. 'dog')
 * @param {string} text     - フォールバック用テキスト (e.g. '狗' or 'いぬ')
 * @param {'ja' | 'zh'} lang - 言語
 * @returns {Promise<void>}
 */
export function speakWord(category, fileKey, text, lang = 'ja') {
    if (!speechEnabled) return Promise.resolve();

    const base = import.meta.env.BASE_URL || '/';
    // ピンイン/ひらがな/カタカナは lang サブディレクトリなし
    const isLangless = category.startsWith('pinyin/') || category === 'hiragana' || category === 'katakana';
    const audioPath = isLangless
        ? `${base}audio/${category}/${fileKey}.mp3`
        : `${base}audio/${category}/${lang}/${fileKey}.mp3`;

    return new Promise((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };

        const audio = new Audio();
        audio.volume = 0.9;
        audio.preload = 'auto';

        audio.onended = done;

        audio.onerror = () => {
            if (resolved) return;
            // MP3が見つからない場合はSpeech APIにフォールバック
            speak(text, lang).then(done);
        };

        audio.oncanplaythrough = () => {
            if (resolved) return;
            audio.play().catch(() => {
                if (resolved) return;
                // autoplay制限等でplay()が拒否された場合もフォールバック
                speak(text, lang).then(done);
            });
        };

        audio.src = audioPath;
    });
}

/**
 * 生成済みMP3で両言語読み上げ（中国語 → 日本語）
 * @param {string} category - フラッシュカードカテゴリ
 * @param {string} fileKey  - ファイル名（拡張子なし）
 * @param {string} jaText   - 日本語テキスト（フォールバック用）
 * @param {string} zhText   - 中国語テキスト（フォールバック用）
 */
export async function speakWordBoth(category, fileKey, jaText, zhText) {
    await speakWord(category, fileKey, zhText, 'zh');
    await new Promise((r) => setTimeout(r, 400));
    await speakWord(category, fileKey, jaText, 'ja');
}

/**
 * ゲームUI音声を再生（correct, wrong, perfect, great, tryagain, howmany等）
 * audio/ui/{lang}/{key}.mp3 から再生、失敗時はテキストでフォールバック
 * @param {string} key - ファイル名（拡張子なし）
 * @param {string} text - フォールバック用テキスト
 * @param {'ja' | 'zh'} lang - 言語
 */
export function speakUI(key, text, lang = 'zh') {
    return speakWord('ui', key, text, lang);
}

export async function speakBoth(jaText, zhText) {
    await speak(zhText, 'zh');
    await new Promise((r) => setTimeout(r, 400));
    await speak(jaText, 'ja');
}

/**
 * タッチ効果音を再生（Web Audio API で生成）
 * @param {'pop' | 'sparkle' | 'whoosh' | 'bubble' | 'chime'} type
 */
export function playSound(type = 'pop') {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        switch (type) {
            case 'pop': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            }
            case 'sparkle': {
                for (let i = 0; i < 3; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    const freq = 800 + i * 400;
                    osc.frequency.setValueAtTime(freq, now + i * 0.08);
                    gain.gain.setValueAtTime(0.12, now + i * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
                    osc.start(now + i * 0.08);
                    osc.stop(now + i * 0.08 + 0.2);
                }
                break;
            }
            case 'whoosh': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
                break;
            }
            case 'bubble': {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            }
            case 'chime': {
                const frequencies = [523, 659, 784]; // C5, E5, G5
                frequencies.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.12);
                    gain.gain.setValueAtTime(0.12, now + i * 0.12);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.5);
                    osc.start(now + i * 0.12);
                    osc.stop(now + i * 0.12 + 0.5);
                });
                break;
            }
        }
    } catch (e) {
        // 音声再生に失敗してもクラッシュさせない
        console.warn('Audio playback failed:', e);
    }
}

/**
 * AudioContextを初期化（ユーザー操作のコールバック内で呼ぶ）
 */
export function initAudio() {
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    } catch (e) {
        console.warn('AudioContext init failed:', e);
    }
}
