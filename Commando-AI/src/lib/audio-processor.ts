export class AudioProcessor {
    private audioChunks: Blob[] = []
    private mediaRecorder: MediaRecorder | null = null
    // eslint-disable-next-line no-undef
    private recordingInterval: NodeJS.Timeout | null = null
    private onTranscription: ((text: string) => void) | null = null
  
    setTranscriptionHandler(handler: (text: string) => void) {
      this.onTranscription = handler
    }
  
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
  
        this.mediaRecorder = new MediaRecorder(stream)
  
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data)
          }
        }
  
        this.mediaRecorder.start()
  
        // Process audio chunks every 3 seconds
        this.recordingInterval = setInterval(() => {
          if (this.mediaRecorder?.state === "recording") {
            this.mediaRecorder.requestData()
            this.processAudioChunk()
          }
        }, 3000)
      } catch (error) {
        console.error("Error starting audio recording:", error)
      }
    }
  
    stopRecording() {
      if (this.mediaRecorder) {
        this.mediaRecorder.stop()
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      }
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval)
      }
      this.audioChunks = []
    }
  
    private async processAudioChunk() {
      if (this.audioChunks.length === 0) return
  
      try {
        const audioContext = new window.AudioContext()
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" })
        const arrayBuffer = await audioBlob.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const wavBlob = this.bufferToWave(audioBuffer)
  
        // Clear chunks for next recording segment
        this.audioChunks = []
  
        const formData = new FormData()
        formData.append("audio", wavBlob, `audio_${Date.now()}.wav`)
        formData.append("language", "en")
  
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        })
  
        if (!response.ok) {
          throw new Error("Failed to transcribe audio")
        }
  
        const { transcript } = await response.json()
  
        if (transcript && transcript.trim() && this.onTranscription) {
          // console.log("Transcription received:", transcript.trim())
          this.onTranscription(transcript.trim())
        }
      } catch (error) {
        console.error("Error processing audio chunk:", error)
      }
    }
  
    private bufferToWave(abuffer: AudioBuffer): Blob {
      const numOfChannels = abuffer.numberOfChannels
      const length = abuffer.length * numOfChannels * 2 + 44
      const buffer = new ArrayBuffer(length)
      const view = new DataView(buffer)
      const channels: Float32Array[] = []
  
      // Collect channel data
      for (let i = 0; i < numOfChannels; i++) {
        channels.push(abuffer.getChannelData(i))
      }
  
      // Write WAV header
      this.setString(view, 0, "RIFF")
      view.setUint32(4, length - 8, true)
      this.setString(view, 8, "WAVE")
      this.setString(view, 12, "fmt ")
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numOfChannels, true)
      view.setUint32(24, abuffer.sampleRate, true)
      view.setUint32(28, abuffer.sampleRate * 2, true)
      view.setUint16(32, numOfChannels * 2, true)
      view.setUint16(34, 16, true)
      this.setString(view, 36, "data")
      view.setUint32(40, length - view.byteLength, true)
  
      // Write PCM samples
      let offset = 44
      for (let i = 0; i < abuffer.length; i++) {
        for (let channel = 0; channel < numOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, channels[channel][i]))
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
          offset += 2
        }
      }
  
      return new Blob([view], { type: "audio/wav" })
    }
  
    private setString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
  }
  
  