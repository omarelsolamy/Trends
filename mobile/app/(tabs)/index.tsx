import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  Keyboard,
  Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { sendChatMessage, sendInfographRequest, sendVoiceMessage, Message } from '@/lib/api';
import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import VoiceNoteBubble from '@/components/VoiceNoteBubble';
import AssistantAudioPlayer from '@/components/AssistantAudioPlayer';
import InfographModal from '@/components/InfographModal';
import TypingIndicator from '@/components/TypingIndicator';
import { Locale, getTranslation } from '@/lib/i18n';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [requestInfograph, setRequestInfograph] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = (id: string) => {
    setPlayingId(id);
  };
  const [locale, setLocale] = useState<Locale>('en');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();
  const t = (key: string) => getTranslation(locale, key);
  const isRTL = locale === 'ar';
  const flatListRef = useRef<FlatList>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listen to keyboard events to get the actual keyboard height
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (requestInfograph) {
        const response = await sendInfographRequest(userMessage.content, 'mobile-thread', controller.signal);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: '',
          imageBase64: response.image_base64,
          meta: response.meta,
          timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const response = await sendChatMessage(userMessage.content, 'mobile-thread', controller.signal);

        const imageBase64 = response.image && response.image !== 'None' ? response.image.trim() : '';
        const content = imageBase64 && response.answer === 'None' ? '' : response.answer;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: content,
          meta: response.meta,
          timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
          ...(imageBase64 && { imageBase64 }),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request cancelled');
      } else {
        console.error('API Error:', err);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleVoiceSend = async (duration: number, uri: string) => {
    setIsRecording(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: 'Voice message',
      contentType: 'voice',
      audioUri: uri,
      durationSeconds: duration,
      timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await sendVoiceMessage(uri, 'mobile-thread', controller.signal);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.audio_base64 ? '' : (response.answer || ''),
        audioBase64: response.audio_base64,
        meta: response.meta,
        timestamp: new Date().toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Voice API Error:', err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const renderBubble = (item: Message, isUser: boolean) => {
    const bubbleRadius = isUser
      ? (isRTL ? 'rounded-br-none' : 'rounded-bl-none')
      : (isRTL ? 'rounded-tl-none' : 'rounded-tr-none');

    if (!isUser && item.audioBase64 && item.contentType !== 'voice') {
      return (
        <View className="flex-col gap-2 w-full">
          {item.content ? (
            <View className={`px-5 py-3 rounded-2xl justify-center bg-gray-100 ${bubbleRadius} border border-gray-100 shadow-sm max-w-[85%]`}>
              <Markdown
                style={{
                  body: {
                    color: '#0D1019',
                    fontSize: 13,
                    lineHeight: 20,
                    fontFamily: 'Cairo_400Regular',
                    textAlign: isRTL ? 'right' : 'left',
                  },
                  paragraph: { marginTop: 0, marginBottom: 0, fontFamily: 'Cairo_400Regular' },
                  strong: { fontFamily: 'Cairo_700Bold', fontWeight: 'normal' },
                }}
              >
                {item.content}
              </Markdown>
            </View>
          ) : null}
          <AssistantAudioPlayer
            audioBase64={item.audioBase64 || ''}
            autoPlay={true}
            isRTL={isRTL}
            messageId={item.id}
            currentPlayingId={playingId}
            onPlay={handlePlay}
          />
        </View>
      );
    }

    const isVoiceMessage = item.contentType === 'voice';
    const bubblePadding = isVoiceMessage ? 'px-4 py-2' : 'px-5 py-3';
    const alignSelf = isUser ? (isVoiceMessage ? 'w-full' : 'self-end') : 'self-start';

    return (
      <View className={`${bubblePadding} rounded-2xl ${alignSelf} ${isUser ? 'bg-[#1F263D]' : 'bg-gray-100'} ${bubbleRadius} ${isUser ? '' : 'border border-gray-100'} shadow-sm`}>
        {item.content && item.contentType !== 'voice' && !item.audioUri ? (
          <Markdown
            style={{
              body: {
                color: isUser ? '#FFFFFF' : '#0D1019',
                fontSize: 13,
                lineHeight: 20,
                fontFamily: 'Cairo_400Regular',
                textAlign: isRTL ? 'right' : 'left',
              },
              paragraph: { marginTop: 0, marginBottom: 0, fontFamily: 'Cairo_400Regular' },
              strong: { fontFamily: 'Cairo_700Bold', fontWeight: 'normal' },
              b: { fontFamily: 'Cairo_700Bold', fontWeight: 'normal' },
              heading1: { fontFamily: 'Cairo_700Bold', fontWeight: 'normal', marginTop: 0 },
              heading2: { fontFamily: 'Cairo_700Bold', fontWeight: 'normal', marginTop: 0 },
              heading3: { fontFamily: 'Cairo_700Bold', fontWeight: 'normal', marginTop: 0 },
              em: { fontFamily: 'Cairo_400Regular', fontStyle: 'italic' },
              i: { fontFamily: 'Cairo_400Regular', fontStyle: 'italic' },
              bullet_list: {
                marginTop: 10,
              },
              ordered_list: {
                marginTop: 10,
              },
              list_item: {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                marginBottom: 5,
              },
              bullet_list_icon: {
                fontFamily: 'Cairo_400Regular',
                fontSize: 13,
                color: isUser ? '#FFFFFF' : '#0D1019',
                marginLeft: isRTL ? 10 : 0,
                marginRight: isRTL ? 0 : 10,
              },
              ordered_list_icon: {
                fontFamily: 'Cairo_600SemiBold',
                fontSize: 13,
                color: isUser ? '#FFFFFF' : '#0D1019',
                marginLeft: isRTL ? 10 : 0,
                marginRight: isRTL ? 0 : 10,
              },
              bullet_list_content: {
                fontFamily: 'Cairo_400Regular',
                fontSize: 13,
                color: isUser ? '#FFFFFF' : '#0D1019',
                flex: 1,
                textAlign: isRTL ? 'right' : 'left',
              },
              ordered_list_content: {
                fontFamily: 'Cairo_400Regular',
                fontSize: 13,
                color: isUser ? '#FFFFFF' : '#0D1019',
                flex: 1,
                textAlign: isRTL ? 'right' : 'left',
              },
            }}
          >
            {item.content}
          </Markdown>
        ) : null}
        {item.contentType === 'voice' && (item.audioBase64 || item.audioUri) && (
          <VoiceNoteBubble
            isUser={isUser}
            audioBase64={item.audioBase64}
            audioUri={item.audioUri}
            durationSeconds={item.durationSeconds || 0}
            messageId={item.id}
            currentPlayingId={playingId}
            onPlay={handlePlay}
          />
        )}
        {item.imageBase64 && (
          <Pressable onPress={() => { setSelectedImage(item.imageBase64!); setIsModalVisible(true); }}>
            <Image
              source={{ uri: `data:image/png;base64,${item.imageBase64}` }}
              style={{ width: 250, height: 250, borderRadius: 12, marginTop: 8 }}
              contentFit="contain"
            />
          </Pressable>
        )}
      </View>
    );
  };

  const renderSources = (item: Message) => {
    if (!item.meta || item.meta.length === 0) return null;
    return (
      <View className="mt-4 w-full">
        <View className={`${isRTL ? 'flex-row-reverse self-end' : 'flex-row self-start'} items-center gap-1.5 mb-2 px-1`}>
          <Feather name="file-text" size={12} color="#828282" />
          <Text style={{ fontFamily: 'Cairo_700Bold' }} className="text-[#828282] text-xs uppercase tracking-wider">{t('Chat.sources')}</Text>
        </View>
        {item.meta.map((source, index) => (
          <Pressable
            key={index}
            onPress={() => source.url && Linking.openURL(source.url)}
            className={`mb-2 p-3 border border-gray-200 rounded-xl bg-gray-50 flex-row ${isRTL ? 'flex-row-reverse' : ''} items-center justify-between active:bg-gray-100`}
          >
            <View className={`flex-1 ${isRTL ? 'ml-2' : 'mr-2'}`}>
              <Text style={{ fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' : 'left' }} className="text-sm text-[#1F263D]" numberOfLines={1}>{source.title || 'Related Source'}</Text>
              <Text style={{ fontFamily: 'Cairo_400Regular', textAlign: isRTL ? 'right' : 'left' }} className="text-[11px] text-[#828282] mt-1">{source.date || 'Source'}</Text>
            </View>
            <Feather name="external-link" size={14} color="#135662" />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.type === 'user';

    const containerJustify = isUser
      ? (isRTL ? 'justify-end' : 'justify-start')
      : (isRTL ? 'justify-start' : 'justify-end');

    return (
      <View className={`${!isUser ? 'mb-10' : 'mb-0'} flex-row w-full ${containerJustify}`}>
        {!isUser && isRTL && (
          <View className="shrink-0 mt-1 mr-3">
            <Image
              source={require('@/assets/images/logo-round.png')}
              style={{ width: 42, height: 42 }}
              contentFit="contain"
            />
          </View>
        )}

        <View className={`max-w-[85%] ${!isUser ? 'mt-4' : ''}`}>
          <View className={`flex-col ${isUser ? (isRTL ? 'items-end' : 'items-start') : (isRTL ? 'items-start' : 'items-end')} w-full`}>
            {renderBubble(item, isUser)}
            {renderSources(item)}
            {isUser && <Text style={{ fontFamily: 'Cairo_400Regular' }} className="text-xs text-[#828282] mt-2 px-1">{item.timestamp}</Text>}
          </View>
        </View>

        {!isUser && !isRTL && (
          <View className="shrink-0 mt-1 ml-3">
            <Image
              source={require('@/assets/images/logo-round.png')}
              style={{ width: 42, height: 42 }}
              contentFit="contain"
            />
          </View>
        )}
      </View>
    );
  };


  const isKeyboardOpen = keyboardHeight > 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right']}>
      {/* Header / TopBar */}
      <View
        className={`px-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center justify-between bg-[#FDFDFD] z-50 shrink-0`}
        style={{
          paddingTop: insets.top,
          height: 70 + insets.top,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.13,
          shadowRadius: 8,
          elevation: 3,
          borderBottomWidth: Platform.OS === 'android' ? 1 : 0,
          borderBottomColor: '#eee'
        }}
      >
        <Image
          source={isRTL ? require('@/assets/images/nav-logo-ar.png') : require('@/assets/images/nav-logo.png')}
          style={{ width: 120, height: 36 }}
          contentFit="contain"
        />

        <View className={`flex-row ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-3`}>
          <View className={`flex-row ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
            <View className={`${isRTL ? 'items-start' : 'items-end'}`}>
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: '#1F263D', lineHeight: 16 }}>{t('Chat.guest')}</Text>
              <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 10, color: '#828282' }}>
                {new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <Image
              source={require('@/assets/images/chat-avatar.png')}
              style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#f3f4f6' }}
            />
          </View>

          <View className="w-px h-6 bg-gray-200" />

          <Pressable
            onPress={() => setLocale(l => l === 'en' ? 'ar' : 'en')}
            className="px-2 py-1 rounded bg-gray-100 active:bg-gray-200"
          >
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 12, color: '#135662' }}>
              {t('Chat.languageLabel')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Chat Content Area - NO KeyboardAvoidingView */}
      <View style={{ flex: 1 }}>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          style={{ flex: 1 }}
          ListFooterComponent={isLoading ? <TypingIndicator isRTL={isRTL} /> : null}
        />


        {/* Input Area - uses marginBottom to push above keyboard */}
        <View
          className="px-4 py-4 bg-white border-t border-gray-100 z-40"
          style={{
            paddingBottom: isKeyboardOpen ? 120 : 12,
            marginBottom: isKeyboardOpen ? (keyboardHeight - insets.bottom) : 0
          }}
        >
          {isRecording ? (
            <View className={`flex-row ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 max-w-4xl mx-auto w-full mb-1`}>
              <View className={`flex-1 bg-[#EDEDED] rounded-2xl px-4 py-2 flex-row ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center min-h-[52px]`}>
                <VoiceNoteRecorder
                  recordingSeconds={recordingSeconds}
                  onCancel={() => setIsRecording(false)}
                  onSend={handleVoiceSend}
                  disabled={isLoading}
                />
              </View>
            </View>
          ) : (
            <View className={`flex-row ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2 max-w-4xl mx-auto w-full mb-1`}>
              <View className={`flex-1 bg-[#EDEDED] rounded-2xl px-4 py-2 flex-row ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center min-h-[52px]`}>
                <TextInput
                  className={`flex-1 text-sm text-[#0D1019] ${isRTL ? 'text-right' : 'text-left'}`}
                  style={{ fontFamily: 'Cairo_400Regular', maxHeight: 120, textAlignVertical: 'top' }}
                  placeholder={t('Chat.askAnything')}
                  placeholderTextColor="#777777"
                  value={inputValue}
                  onChangeText={setInputValue}
                  multiline
                  editable={!isLoading}
                />

                <Pressable
                  onPress={() => setRequestInfograph(!requestInfograph)}
                  className={`p-2 rounded-full ${requestInfograph ? 'bg-[#135662]' : 'active:bg-black/5'}`}
                >
                  <Feather name="bar-chart-2" size={20} color={requestInfograph ? 'white' : '#828282'} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsRecording(true);
                  }}
                  disabled={isLoading}
                  className="p-2 active:bg-black/5 rounded-full"
                >
                  <Feather name="mic" size={20} color="#1F263D" />
                </Pressable>
              </View>

              <Pressable
                onPress={isLoading ? handleStopResponse : handleSend}
                disabled={!isLoading && !inputValue.trim()}
                className={`w-11 h-11 rounded-full items-center justify-center ${isLoading ? 'bg-[#1F263D]' : 'bg-[#1F263D] active:bg-[#2a3347] disabled:opacity-50'}`}
              >
                {isLoading ? (
                  <Feather name="square" size={16} color="white" fill="white" />
                ) : (
                  <Feather name="send" size={18} color="white" />
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {isModalVisible && (
        <InfographModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          imageBase64={selectedImage || ''}
        />
      )}
    </SafeAreaView>
  );
}
