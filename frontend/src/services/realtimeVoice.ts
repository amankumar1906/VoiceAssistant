// Voice WebSocket client - connects to backend relay
// Backend relays to OpenAI Realtime API with proper authentication

export interface RealtimeConfig {
  backendUrl: string;
  token: string;
}

export interface VoiceSessionCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onAudioReceived?: (audio: ArrayBuffer) => void;
  onTranscriptUpdate?: (text: string, role: 'user' | 'assistant', isFinal: boolean) => void;
  onFunctionCall?: (name: string, args: any) => void;
}

export class RealtimeVoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private callbacks: VoiceSessionCallbacks;
  private config: RealtimeConfig;
  private audioQueue: ArrayBuffer[] = [];
  private isPlayingAudio = false;
  private recordingStartTime = 0;
  private hasActiveResponse = false;

  constructor(config: RealtimeConfig, callbacks: VoiceSessionCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  async connect(): Promise<void> {
    try {
      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Connect to backend WebSocket (which relays to OpenAI)
      const wsUrl = this.config.backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      const url = `${wsUrl}/api/voice/ws?token=${encodeURIComponent(this.config.token)}`;

      console.log('Connecting to voice WebSocket...');

      this.ws = new WebSocket(url);

      this.ws.addEventListener('open', this.handleOpen.bind(this));
      this.ws.addEventListener('message', this.handleMessage.bind(this));
      this.ws.addEventListener('error', this.handleError.bind(this));
      this.ws.addEventListener('close', this.handleClose.bind(this));

    } catch (error) {
      console.error('Failed to connect:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  private handleOpen() {
    console.log('WebSocket connected to backend relay');
    // Backend handles session configuration and OpenAI connection
    this.callbacks.onConnect?.();
  }

  private async handleMessage(event: MessageEvent) {
    try {
      // Handle binary data (audio) vs text data (JSON events)
      let data: any;

      if (event.data instanceof Blob) {
        // Binary audio data - convert to text first
        const text = await event.data.text();
        data = JSON.parse(text);
      } else if (typeof event.data === 'string') {
        // Text data - parse as JSON
        data = JSON.parse(event.data);
      } else {
        console.warn('Unknown message type:', typeof event.data);
        return;
      }

      console.log('Received event:', data.type);

      switch (data.type) {
        case 'session.created':
        case 'session.updated':
          console.log('Session configured:', data.session);
          break;

        case 'response.created':
          console.log('Response started');
          this.hasActiveResponse = true;
          break;

        case 'input_audio_buffer.speech_started':
          console.log('User started speaking');
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('User stopped speaking');
          break;

        case 'conversation.item.created':
          console.log('Item created:', data.item);
          break;

        case 'response.audio.delta':
          // Received audio chunk from assistant
          if (data.delta) {
            const audioData = this.base64ToArrayBuffer(data.delta);
            this.callbacks.onAudioReceived?.(audioData);
            // Queue audio instead of playing immediately
            this.audioQueue.push(audioData);
            this.processAudioQueue();
          }
          break;

        case 'response.audio_transcript.delta':
          // Assistant transcript update (partial)
          if (data.delta) {
            this.callbacks.onTranscriptUpdate?.(data.delta, 'assistant', false);
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User's speech transcription (final)
          if (data.transcript) {
            this.callbacks.onTranscriptUpdate?.(data.transcript, 'user', true);
          }
          break;

        case 'response.audio_transcript.done':
          // Assistant transcript completed - final full transcript
          console.log('Assistant transcript complete:', data.transcript);
          if (data.transcript) {
            this.callbacks.onTranscriptUpdate?.(data.transcript, 'assistant', true);
          }
          break;

        case 'response.done':
          // Response fully complete - reset state
          console.log('Response complete');
          this.hasActiveResponse = false;
          break;

        case 'response.function_call_arguments.done':
          // Function call completed
          this.callbacks.onFunctionCall?.(data.name, JSON.parse(data.arguments));
          break;

        case 'error':
          console.error('API error:', data.error);

          // Filter out non-critical errors that shouldn't be shown to users
          const ignorableErrors = [
            'input_audio_buffer_commit_empty',
            'conversation_already_has_active_response'
          ];

          if (!ignorableErrors.includes(data.error.code)) {
            // Only show critical errors to users
            this.callbacks.onError?.(new Error(data.error.message));
          }
          break;

        default:
          // Log other events for debugging
          if (data.type.startsWith('error')) {
            console.error('Error event:', data);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    this.callbacks.onError?.(new Error('WebSocket connection error'));
  }

  private handleClose() {
    console.log('WebSocket disconnected');
    this.callbacks.onDisconnect?.();
    this.cleanup();
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64Audio = this.arrayBufferToBase64(pcm16.buffer);

        // Send audio to OpenAI
        this.sendEvent({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        });
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.recordingStartTime = Date.now();
      console.log('Recording started');

    } catch (error) {
      console.error('Failed to start recording:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Only commit if we recorded for at least 200ms (to avoid empty buffer error)
    const recordingDuration = Date.now() - this.recordingStartTime;

    if (this.ws && this.ws.readyState === WebSocket.OPEN && recordingDuration >= 200) {
      // Commit the audio buffer
      this.sendEvent({
        type: 'input_audio_buffer.commit'
      });

      // Only request a response if there isn't already one active
      if (!this.hasActiveResponse) {
        this.sendEvent({
          type: 'response.create'
        });
        console.log('Recording stopped and committed, requesting response');
      } else {
        console.log('Recording stopped but response already active');
      }
    } else if (recordingDuration < 200) {
      console.log('Recording too short, not committing');
    }
  }

  private sendEvent(event: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private async processAudioQueue(): Promise<void> {
    // If already playing or queue is empty, return
    if (this.isPlayingAudio || this.audioQueue.length === 0) return;

    this.isPlayingAudio = true;

    // Process all queued audio chunks
    while (this.audioQueue.length > 0) {
      const audioData = this.audioQueue.shift()!;
      await this.playAudio(audioData);
    }

    this.isPlayingAudio = false;
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    return new Promise((resolve, reject) => {
      try {
        // Convert PCM16 to Float32 for Web Audio API
        const int16Array = new Int16Array(audioData);
        const float32Array = new Float32Array(int16Array.length);

        // Convert Int16 samples to Float32 (-1.0 to 1.0)
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
        }

        // Create audio buffer directly from Float32 samples
        const audioBuffer = this.audioContext!.createBuffer(
          1, // mono
          float32Array.length,
          24000 // sample rate
        );

        // Copy data to audio buffer
        audioBuffer.getChannelData(0).set(float32Array);

        // Play the buffer
        const source = this.audioContext!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext!.destination);

        // Wait for this chunk to finish before playing next
        source.onended = () => resolve();

        source.start();
      } catch (error) {
        console.error('Error playing audio:', error);
        reject(error);
      }
    });
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }


  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stopRecording();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
