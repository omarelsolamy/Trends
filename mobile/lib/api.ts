export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://rag-poc-8css.onrender.com';

export interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    contentType?: 'text' | 'voice';
    audioBase64?: string;
    audioUri?: string;
    durationSeconds?: number;
    imageBase64?: string;
    meta?: MetaData[];
}

export interface MetaData {
    date: string;
    title: string;
    writer: string;
    url: string;
}

export interface ChatResponse {
    answer: string;
    meta: MetaData[];
    image?: string;
}

export interface VoiceChatResponse extends ChatResponse {
    audio_base64?: string;
}

export interface InfographResponse {
    meta: MetaData[];
    image_base64: string;
}

export async function sendInfographRequest(
    question: string,
    threadId: string,
    signal?: AbortSignal
): Promise<InfographResponse> {
    const payload = { question, thread_id: threadId };

    const response = await fetch(`${API_BASE_URL}/infograph/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Infograph API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;
}

export async function sendChatMessage(
    question: string,
    threadId: string,
    signal?: AbortSignal
): Promise<ChatResponse> {
    const payload = { question, thread_id: threadId };

    console.log('API Request Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    console.log('API Response:', JSON.stringify(responseData, null, 2));

    return responseData;
}

export async function sendVoiceMessage(
    audioUri: string, // On mobile we'll pass the local file URI
    threadId: string,
    signal?: AbortSignal
): Promise<VoiceChatResponse> {
    const formData = new FormData();

    // React Native FormData file append
    formData.append('file', {
        uri: audioUri,
        name: 'audio.mp4',
        type: 'audio/mp4',
    } as any);

    formData.append('thread_id', threadId);
    formData.append('mode', 'audio');

    const response = await fetch(`${API_BASE_URL}/voice/chat`, {
        method: 'POST',
        body: formData,
        signal,
    });

    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Voice API Response:', JSON.stringify(responseData, null, 2));

    return responseData;
}

// In RN, we don't really use FileReader for base64 as much as we use expo-file-system
// but we'll keep it for now as it might be used for small blobs.
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result?.includes(',') ? result.split(',')[1] : result ?? '';
            resolve(base64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}
