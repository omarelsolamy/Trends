const DEMO_QUESTION = 'ما جهود الصين في تطوير قدراتها في الذكاء الاصطناعي, وهل تتفوق على أمريكيا في هذا المجال؟';

const DEMO_AUDIO_URL = '/assets/ElevenLabs_2026-02-16T12_31_48_Ghawi - Professional and Dynamic_pvc_sp94_s47_sb42_se49_b_m2.mp3';

const KEYWORD_GROUPS = [
  ['الصين'],
  ['الذكاء الاصطناعي', 'الذكاءالاصطناعي'],
  ['امريكا', 'امريكيا', 'أمريكا', 'أمريكيا'],
  ['تفوق', 'تتفوق'],
];

function normalizeArabicText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .replace(/[؟?.,،!؛:"'()\[\]{}]/g, '');
}

export function isChinaAiDemoQuestion(input: string): boolean {
  const normalized = normalizeArabicText(input);
  if (!normalized) return false;

  if (normalized === normalizeArabicText(DEMO_QUESTION)) {
    return true;
  }

  let matchedGroups = 0;
  for (const group of KEYWORD_GROUPS) {
    if (group.some((word) => normalized.includes(normalizeArabicText(word)))) {
      matchedGroups += 1;
    }
  }

  return matchedGroups >= 3;
}

export function isVoiceDemoFastPathResponse(response: unknown): boolean {
  const payload = response as Record<string, unknown>;
  const candidates = [
    payload.question,
    payload.query,
    payload.transcript,
    payload.transcription,
    payload.user_question,
    payload.input_text,
    payload.answer,
  ];

  return candidates.some((value) => typeof value === 'string' && isChinaAiDemoQuestion(value));
}

export { DEMO_AUDIO_URL };
