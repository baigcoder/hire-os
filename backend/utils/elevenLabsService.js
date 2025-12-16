/**
 * ElevenLabs TTS Service - Real-time Voice Generation
 * 
 * Features:
 * - Text-to-Speech with streaming audio
 * - Character usage tracking (for free tier)
 * - Voice selection with speed/style controls
 * - Multilingual support
 * - Error handling with fallback
 */

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Free tier voice options (from ElevenLabs - verified working voices)
const VOICES = {
    // Female voices
    RACHEL: '21m00Tcm4TlvDq8ikWAM',      // Professional female (default)
    MATILDA: 'XrExE9yKIg1WjnnlVkGX',     // Professional woman, pleasing alto
    ALICE: 'Xb7hH8MSUJpSbSDYk0k2',       // Clear, engaging, British female

    // Male voices  
    LIAM: 'TX3LPaxmHKxFdv7VOQHJ',        // Young adult, energy and warmth (American)
    CLYDE: '2EiwWnXFnvU5JabPnv8n',       // War veteran, deep, intense
    ADAM: 'pNInz6obpgDQGcFmaJgB',        // Deep male voice
};

// Voice metadata for UI
const VOICE_OPTIONS = [
    { id: 'RACHEL', name: 'Rachel', gender: 'female', description: 'Professional female voice', voiceId: VOICES.RACHEL },
    { id: 'MATILDA', name: 'Matilda', gender: 'female', description: 'Professional woman, pleasing alto', voiceId: VOICES.MATILDA },
    { id: 'ALICE', name: 'Alice', gender: 'female', description: 'Clear, engaging, British accent', voiceId: VOICES.ALICE },
    { id: 'LIAM', name: 'Liam', gender: 'male', description: 'Young adult with energy and warmth', voiceId: VOICES.LIAM },
    { id: 'CLYDE', name: 'Clyde', gender: 'male', description: 'Deep, intense male voice', voiceId: VOICES.CLYDE },
    { id: 'ADAM', name: 'Adam', gender: 'male', description: 'Deep professional male voice', voiceId: VOICES.ADAM },
];

// Model options
const MODELS = {
    MULTILINGUAL: 'eleven_multilingual_v2',   // Best quality, multi-language
    TURBO: 'eleven_turbo_v2_5',               // Fastest, English only (v2.5)
    MONOLINGUAL: 'eleven_monolingual_v1'      // Legacy free tier friendly
};

// Supported languages for multilingual model
const LANGUAGES = [
    { id: 'en', name: 'English', flag: '🇺🇸' },
    { id: 'es', name: 'Spanish', flag: '🇪🇸' },
    { id: 'fr', name: 'French', flag: '🇫🇷' },
    { id: 'de', name: 'German', flag: '🇩🇪' },
    { id: 'it', name: 'Italian', flag: '🇮🇹' },
    { id: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { id: 'pl', name: 'Polish', flag: '🇵🇱' },
    { id: 'hi', name: 'Hindi', flag: '🇮🇳' },
    { id: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { id: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { id: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { id: 'ko', name: 'Korean', flag: '🇰🇷' },
];

// Voice speed presets
const SPEED_PRESETS = {
    slow: { stability: 0.8, similarityBoost: 0.9, style: 0.0 },    // Clear, slow speech
    normal: { stability: 0.5, similarityBoost: 0.75, style: 0.0 }, // Balanced
    fast: { stability: 0.3, similarityBoost: 0.6, style: 0.2 },    // Quick, dynamic
};

// Voice style presets
const STYLE_PRESETS = {
    professional: { stability: 0.7, similarityBoost: 0.8, style: 0.0 },  // Formal, clear
    casual: { stability: 0.4, similarityBoost: 0.7, style: 0.3 },        // Relaxed, friendly
    expressive: { stability: 0.2, similarityBoost: 0.5, style: 0.5 },    // Animated, varied
};

// Character usage tracking (in-memory, reset on server restart)
let characterUsage = {
    used: 0,
    limit: 10000, // Free tier limit
    resetDate: new Date().toISOString().slice(0, 7) // YYYY-MM
};

/**
 * Get API key from environment
 */
const getApiKey = () => process.env.ELEVENLABS_API_KEY;
const getDefaultVoice = () => process.env.ELEVENLABS_VOICE_ID || VOICES.RACHEL;

/**
 * Get voice settings based on speed and style presets
 */
const getVoiceSettings = (speedPreset = 'normal', stylePreset = 'professional') => {
    const speed = SPEED_PRESETS[speedPreset] || SPEED_PRESETS.normal;
    const style = STYLE_PRESETS[stylePreset] || STYLE_PRESETS.professional;

    return {
        stability: (speed.stability + style.stability) / 2,
        similarityBoost: (speed.similarityBoost + style.similarityBoost) / 2,
        style: Math.max(speed.style, style.style)
    };
};

/**
 * Generate speech from text using ElevenLabs
 * Returns base64 encoded audio
 * 
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Configuration options
 * @param {string} options.voiceId - Voice ID to use
 * @param {string} options.language - Language code (en, es, fr, etc.)
 * @param {string} options.speedPreset - Speed preset (slow, normal, fast)
 * @param {string} options.stylePreset - Style preset (professional, casual, expressive)
 */
export const textToSpeech = async (text, options = {}) => {
    const {
        voiceId = getDefaultVoice(),
        language = 'en',
        speedPreset = 'normal',
        stylePreset = 'professional',
        stability: customStability,
        similarityBoost: customSimilarity,
        style: customStyle,
        useSpeakerBoost = true
    } = options;

    // Select model based on language
    const model = language === 'en' ? MODELS.TURBO : MODELS.MULTILINGUAL;

    // Get voice settings from presets or use custom values
    const presetSettings = getVoiceSettings(speedPreset, stylePreset);
    const stability = customStability ?? presetSettings.stability;
    const similarityBoost = customSimilarity ?? presetSettings.similarityBoost;
    const styleValue = customStyle ?? presetSettings.style;

    const apiKey = getApiKey();
    if (!apiKey) {
        console.error('❌ [ElevenLabs] API key not configured');
        throw new Error('ElevenLabs API key not configured');
    }

    // Track character usage
    const charCount = text.length;
    characterUsage.used += charCount;
    console.log(`🎤 [ElevenLabs] Generating speech: ${charCount} chars, lang=${language}, model=${model}`);
    console.log(`   Settings: stability=${stability.toFixed(2)}, similarity=${similarityBoost.toFixed(2)}, style=${styleValue.toFixed(2)}`);

    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text,
                model_id: model,
                voice_settings: {
                    stability,
                    similarity_boost: similarityBoost,
                    style: styleValue,
                    use_speaker_boost: useSpeakerBoost
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [ElevenLabs] API Error:', response.status, errorText);
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        // Get audio as buffer
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        console.log(`✅ [ElevenLabs] Generated ${(audioBuffer.byteLength / 1024).toFixed(1)}KB audio`);

        return {
            audioBase64: base64Audio,
            audioType: 'audio/mpeg',
            charCount,
            remainingChars: characterUsage.limit - characterUsage.used,
            language,
            model
        };

    } catch (error) {
        console.error('❌ [ElevenLabs] TTS failed:', error.message);
        throw error;
    }
};

/**
 * Stream speech generation (for larger texts)
 * Returns a readable stream for progressive audio playback
 * 
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Configuration options
 */
export const textToSpeechStream = async (text, options = {}) => {
    const {
        voiceId = getDefaultVoice(),
        language = 'en',
        speedPreset = 'normal',
        stylePreset = 'professional'
    } = options;

    const model = language === 'en' ? MODELS.TURBO : MODELS.MULTILINGUAL;
    const settings = getVoiceSettings(speedPreset, stylePreset);

    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('ElevenLabs API key not configured');
    }

    console.log(`🎤 [ElevenLabs] Streaming speech: ${text.length} chars, lang=${language}`);
    characterUsage.used += text.length;

    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: {
                stability: settings.stability,
                similarity_boost: settings.similarityBoost,
                style: settings.style
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ElevenLabs] Streaming Error:', response.status, errorText);
        throw new Error(`ElevenLabs streaming error: ${response.status}`);
    }

    console.log(`✅ [ElevenLabs] Stream started for ${text.length} chars`);
    return response.body;
};

/**
 * Get available voices from ElevenLabs
 */
export const getVoices = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return [];

    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
            headers: { 'xi-api-key': apiKey }
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.voices || [];
    } catch (error) {
        console.error('❌ [ElevenLabs] Failed to fetch voices:', error.message);
        return [];
    }
};

/**
 * Get user subscription info (character usage)
 */
export const getSubscriptionInfo = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
            headers: { 'xi-api-key': apiKey }
        });

        if (!response.ok) return null;

        const data = await response.json();
        console.log(`📊 [ElevenLabs] Character limit: ${data.character_limit}, Used: ${data.character_count}`);

        // Update local tracking with actual values
        characterUsage.limit = data.character_limit;
        characterUsage.used = data.character_count;

        return {
            characterLimit: data.character_limit,
            charactersUsed: data.character_count,
            charactersRemaining: data.character_limit - data.character_count,
            tier: data.tier
        };
    } catch (error) {
        console.error('❌ [ElevenLabs] Failed to get subscription:', error.message);
        return null;
    }
};

/**
 * Get current character usage
 */
export const getCharacterUsage = () => characterUsage;

/**
 * Check if we have enough characters for a response
 */
export const hasCharacterBudget = (estimatedChars = 300) => {
    return (characterUsage.limit - characterUsage.used) >= estimatedChars;
};

/**
 * Get available voice options for UI
 */
export const getVoiceOptions = () => VOICE_OPTIONS;

/**
 * Get available languages for UI
 */
export const getLanguages = () => LANGUAGES;

/**
 * Get available speed presets for UI
 */
export const getSpeedPresets = () => Object.keys(SPEED_PRESETS);

/**
 * Get available style presets for UI
 */
export const getStylePresets = () => Object.keys(STYLE_PRESETS);

// Export constants
export { VOICES, MODELS, VOICE_OPTIONS, LANGUAGES, SPEED_PRESETS, STYLE_PRESETS };

export default {
    textToSpeech,
    textToSpeechStream,
    getVoices,
    getVoiceOptions,
    getLanguages,
    getSpeedPresets,
    getStylePresets,
    getSubscriptionInfo,
    getCharacterUsage,
    hasCharacterBudget,
    VOICES,
    MODELS,
    VOICE_OPTIONS,
    LANGUAGES,
    SPEED_PRESETS,
    STYLE_PRESETS
};
