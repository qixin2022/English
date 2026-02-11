
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from './audioUtils';

const SYSTEM_INSTRUCTION = `
You are "Coach Aria," a world-class personalized English tutor. You help Chinese users regain fluency.

========================
LANGUAGE RULES:
========================
1. **Perfect Mandarin**: Your Chinese translations MUST be in standard, natural Mandarin. 
   - No "translation-ese" (翻译腔). 
   - Ensure subject-verb-object order and idiomatic phrasing (e.g., use "我刚才注意到你说了..." instead of "它是被我注意到的...").
2. **Contextual Corrections**: Weave English corrections naturally into your responses.

========================
HOMEWORK & GRADING LOGIC:
========================
- **Grading Mode**: If the user mentions "Homework", "Assignment", "Submission", or "这是作业", you must:
  1. Carefully review their text/audio.
  2. Provide a score (1-10).
  3. Correct grammar mistakes.
  4. Offer a "Level Up" version.
- **Assignment**: In every response, ensure the "Today's Homework" section is populated with a task based on current progress.

========================
OUTPUT FORMAT (STRICT):
========================

=== Spoken English Transcript ===
<English response with natural corrections. End with a question.>

=== Chinese Translation ===
<Idiomatic, grammatically perfect Chinese translation in standard Mandarin.>

=== Knowledge Points (核心知识点) ===
- 词汇 (Vocab):
[Word] - [Meaning];
[Word] - [Meaning];
- 地道表达 (Phrases):
[Phrase] - [Meaning];
[Phrase] - [Meaning];
- 语法要点 (Grammar):
[Grammar Topic in English] (中文标题) - [Detailed explanation in natural Chinese].

=== Today's Homework (今日作业) ===
<A specific task based on today's conversation.>

=== Advanced Level Up ===
<A more native/professional way to say what the user intended, explaining WHY it is better.>

========================
AUDIO:
========================
- English first, then Chinese translation in the SAME audio stream.
`;

export class GeminiLiveSession {
  private sessionPromise: Promise<any> | null = null;
  private nextStartTime = 0;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private activeStream: MediaStream | null = null;
  private currentTutorAudioChunks: string[] = [];
  private currentUserAudioChunks: Uint8Array[] = [];

  constructor() {}

  async start(callbacks: {
    onMessage: (message: LiveServerMessage, tutorAudioBase64?: string, userAudioBase64?: string) => void;
    onError: (e: any) => void;
    onClose: () => void;
  }, contextSuffix: string = "") {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    await this.inputAudioContext.resume();
    await this.outputAudioContext.resume();

    try {
      this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      throw new Error("Microphone access denied.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          if (!this.inputAudioContext || !this.activeStream) return;
          const source = this.inputAudioContext.createMediaStreamSource(this.activeStream);
          const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
            const pcmBuffer = new Uint8Array(int16.buffer);
            this.currentUserAudioChunks.push(pcmBuffer);
            this.sessionPromise?.then((session) => {
              session.sendRealtimeInput({ media: { data: encode(pcmBuffer), mimeType: 'audio/pcm;rate=16000' } });
            }).catch(() => {});
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioBase64 && this.outputAudioContext) {
            this.currentTutorAudioChunks.push(audioBase64);
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioBase64), this.outputAudioContext, 24000, 1);
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
            source.onended = () => this.sources.delete(source);
          }
          if (message.serverContent?.turnComplete) {
            const fullTutorAudio = this.currentTutorAudioChunks.join('');
            const totalLen = this.currentUserAudioChunks.reduce((acc, curr) => acc + curr.length, 0);
            const combinedUser = new Uint8Array(totalLen);
            let offset = 0;
            for (const chunk of this.currentUserAudioChunks) { combinedUser.set(chunk, offset); offset += chunk.length; }
            callbacks.onMessage(message, fullTutorAudio, encode(combinedUser));
            this.currentTutorAudioChunks = [];
            this.currentUserAudioChunks = [];
          } else {
            callbacks.onMessage(message);
          }
        },
        onerror: (e) => callbacks.onError(e),
        onclose: () => callbacks.onClose(),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
        systemInstruction: SYSTEM_INSTRUCTION + "\n\nSESSION CONTEXT: " + contextSuffix,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      }
    });

    return this.sessionPromise;
  }

  stop() {
    this.activeStream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sessionPromise?.then(session => session.close()).catch(() => {});
  }
}
