/**
 * announcerVoice.js
 * ---------------------------------------------------------------------------
 * Picks which installed SpeechSynthesisVoice the dealer/announcer speaks
 * with (see useCasinoAudio.js's speak()) and the pitch/rate that gives it a
 * lower, slower, more "sultry" delivery than a default TTS voice's usual
 * bright/brisk read.
 *
 * The Web Speech API has no standardized gender field on SpeechSynthesisVoice
 * (just name/lang/localService/default) - every browser/OS ships a different
 * voice roster under different names, so matching "female" is necessarily a
 * name-heuristic, not a queryable property. `FEMALE_VOICE_NAME_HINTS` lists
 * the common female voice names across Chrome/Edge/Safari/Windows/macOS;
 * first match wins, preferring an English voice when more than one matches.
 */

/** Substrings (lowercased) that identify a female system/browser voice by
 * name across the major platforms this app is likely to run on. Ordered
 * roughly by how natural/"smooth" each tends to sound, not alphabetically -
 * earlier entries are preferred when multiple are installed. */
const FEMALE_VOICE_NAME_HINTS = [
  'female',
  'samantha', // macOS/iOS Safari
  'victoria', // macOS
  'karen', // macOS/Windows (Australian)
  'moira', // macOS (Irish)
  'tessa', // macOS (South African)
  'zira', // Windows (Microsoft David/Zira)
  'aria', // Windows/Edge (Microsoft Aria - Natural)
  'jenny', // Edge (Microsoft Jenny - Natural)
  'susan',
  'hazel', // Windows (British English)
  'catherine', // Windows (Australian)
  'linda', // Windows
  'google uk english female',
  'google us english',
];

let cachedVoice;
let cachedVoiceListLength = -1;

function scoreVoice(voice) {
  const name = voice.name.toLowerCase();
  const hintIndex = FEMALE_VOICE_NAME_HINTS.findIndex((hint) => name.includes(hint));
  if (hintIndex === -1) return null;
  // Earlier hints score higher; an English-language voice breaks ties
  // (this app's voice lines are always English text, see voiceLines.js).
  const languageBonus = voice.lang?.toLowerCase().startsWith('en') ? 1000 : 0;
  return languageBonus + (FEMALE_VOICE_NAME_HINTS.length - hintIndex);
}

/**
 * Returns the best-guess female SpeechSynthesisVoice available in this
 * browser, or `null` if the API is unsupported or nothing matches (the
 * caller should just leave `utterance.voice` unset in that case - the
 * browser's own default). Re-scans on every call rather than caching
 * forever: Chrome in particular populates `getVoices()` asynchronously
 * (after a `voiceschanged` event), so the very first call in a session can
 * legitimately see an empty list before a later one sees the full roster -
 * cheap to recompute given voice lists rarely change size mid-session.
 */
export function pickAnnouncerVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  if (voices.length === cachedVoiceListLength) return cachedVoice ?? null;

  let best = null;
  let bestScore = -1;
  voices.forEach((voice) => {
    const score = scoreVoice(voice);
    if (score !== null && score > bestScore) {
      best = voice;
      bestScore = score;
    }
  });

  cachedVoice = best;
  cachedVoiceListLength = voices.length;
  return best;
}

/** Pitch/rate tuned for a lower, slower, more sultry delivery than a
 * default TTS read - browser TTS can't act (no real prosody control beyond
 * pitch/rate/volume), so this is the closest a SpeechSynthesisUtterance can
 * get: pitched down for a huskier tone, paced down for a more deliberate,
 * inviting cadence rather than a brisk announcement read. */
export const ANNOUNCER_PITCH = 0.82;
export const ANNOUNCER_RATE = 0.88;
