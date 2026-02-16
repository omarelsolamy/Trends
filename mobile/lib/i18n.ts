export const translations = {
    en: {
        Chat: {
            smartAssistant: "Smart Assistant",
            askAnything: "Ask anything...",
            guest: "Guest",
            sources: "Sources",
            thinking: "Thinking...",
            clear: "Clear",
            stopResponse: "Stop",
            sendMessage: "Send",
            failedToGetResponse: "Failed to get response. Please try again.",
            languageLabel: "AR",
        },
    },
    ar: {
        Chat: {
            smartAssistant: "المساعد الذكي",
            askAnything: "اطرح أي سؤال...",
            guest: "زائر",
            sources: "المصادر",
            thinking: "جاري التحميل...",
            clear: "مسح",
            stopResponse: "إيقاف",
            sendMessage: "إرسال",
            failedToGetResponse: "فشل في الحصول على الرد. يرجى المحاولة مرة أخرى.",
            languageLabel: "EN",
        },
    },
};

export type Locale = 'en' | 'ar';

export function getTranslation(locale: Locale, key: string) {
    const keys = key.split('.');
    let result: any = (translations as any)[locale];
    for (const k of keys) {
        if (result[k]) {
            result = result[k];
        } else {
            return key;
        }
    }
    return result;
}
