"use client"

import MeetingChat from "@/components/MeetingChat"
import { useEffect, useRef, useState } from "react"
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
} from "@stream-io/video-react-sdk"
import { useRouter, useSearchParams } from "next/navigation"
import { Users, LayoutList, Mic } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import Loader from "./Loader"
import EndCallButton from "./EndCallButton"
import { cn } from "@/lib/utils"

type CallLayoutType = "grid" | "speaker-left" | "speaker-right"

const MeetingRoom = () => {
  const searchParams = useSearchParams()
  const isPersonalRoom = !!searchParams.get("personal")
  const router = useRouter()
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left")
  const [showParticipants, setShowParticipants] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState<string>("")
  const { useCallCallingState } = useCallStateHooks()
  const callingState = useCallCallingState()

  const audioChunks = useRef<Blob[]>([])
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  
  // startAudioRecording: Begin recording and accumulate chunks.
  const startAudioRecording = useRef(async () => {
    try {
      console.log("Attempting to start audio recording...")
      // Clear any previous chunks.
      audioChunks.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Audio chunk captured:", event.data.size, "bytes")
          audioChunks.current.push(event.data)
        }
      }

      mediaRecorder.current.onstart = () => console.log("MediaRecorder started")
      // When the recorder stops, trigger sending the audio to the API.
      mediaRecorder.current.onstop = () => {
        console.log("MediaRecorder stopped")
        saveAndSendAudio()
      }
      mediaRecorder.current.onerror = (event) => console.error("MediaRecorder error:", event)
      
      mediaRecorder.current.start()
      console.log("Recording started...")
    } catch (error) {
      console.error("Error starting audio recording:", error)
      setIsRecording(false)
    }
  })

  // stopAudioRecording: Stop recording. The onstop handler will send the audio.
  const stopAudioRecording = useRef(() => {
    console.log("Stopping audio recording...")
    if (mediaRecorder.current) {
      try {
        mediaRecorder.current.stop()
        mediaRecorder.current.stream.getTracks().forEach((track) => track.stop())
        mediaRecorder.current = null
      } catch (error) {
        console.error("Error stopping recording:", error)
      }
    }
  })

  // saveAndSendAudio: Called only when recording is stopped.
  const saveAndSendAudio = async () => {
    if (audioChunks.current.length === 0) return

    try {
      console.log("Creating audio blob from chunks...")
      // We're using "audio/webm" as the recorded format.
      const blob = new Blob(audioChunks.current, { type: "audio/webm" })
      console.log("Audio blob size:", blob.size, "bytes")
      
      const formData = new FormData()
      formData.append("file", blob, "recording.webm")
      formData.append("meetingId", searchParams.get("id") || "default-meeting")

      console.log("Sending audio blob to server...")
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      console.log("Server response received")
      if (!response.ok) throw new Error("Failed to send audio")

      const data = await response.json()
      console.log("Transcription received:", data.transcription)
      if (data.transcription) {
        setTranscriptionText(data.transcription)
      }
    } catch (error) {
      console.error("Error sending audio to server:", error)
    }

    // Clear the chunks after sending
    audioChunks.current = []
  }

  // useEffect: Start or stop recording based on isRecording state.
  useEffect(() => {
    if (callingState === CallingState.JOINED && isRecording) {
      startAudioRecording.current()
    } else if (!isRecording && mediaRecorder.current) {
      // Stop recording only when user toggles off recording.
      stopAudioRecording.current()
    }

    return () => {
      if (mediaRecorder.current) {
        stopAudioRecording.current()
      }
    }
  }, [callingState, isRecording])

  // Call layout switcher
  const CallLayout = () => {
    switch (layout) {
      case "grid":
        return <PaginatedGridLayout />
      case "speaker-right":
        return <SpeakerLayout participantsBarPosition="left" />
      default:
        return <SpeakerLayout participantsBarPosition="right" />
    }
  }

  if (callingState !== CallingState.JOINED) return <Loader />

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>
        <div
          className={cn("h-[calc(100vh-86px)] hidden ml-2", {
            "show-block": showParticipants,
          })}
        >
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </div>
      </div>

      {/* Transcription / Recording Display */}
      {isRecording ? (
        <div className="absolute bottom-60 left-0 right-0 bg-black/50 p-4 text-white">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
            <div className="text-sm">Recording in progress...</div>
          </div>
        </div>
      ) : transcriptionText ? (
        <div className="absolute bottom-60 left-0 right-0 bg-black/50 p-4 text-white rounded-md shadow-lg">
          <div className="mx-auto max-w-3xl">
            <h3 className="text-lg font-semibold mb-2">Transcription</h3>
            <p className="text-sm whitespace-pre-wrap">{transcriptionText}</p>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-0 flex w-full items-center justify-center gap-5">
        <CallControls onLeave={() => router.push(`/`)} />
        <button onClick={() => setIsRecording((prev) => !prev)} className="relative">
          <div
            className={cn(
              "cursor-pointer rounded-2xl px-4 py-2 transition-colors",
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-[#19232d] hover:bg-[#4c535b]"
            )}
          >
            <Mic size={20} className="text-white" />
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <LayoutList size={20} className="text-white" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {["Grid", "Speaker-Left", "Speaker-Right"].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem onClick={() => setLayout(item.toLowerCase() as CallLayoutType)}>
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CallStatsButton />
        <button onClick={() => setShowParticipants((prev) => !prev)}>
          <div className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <Users size={20} className="text-white" />
          </div>
        </button>
        {!isPersonalRoom && <MeetingChat />}
        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  )
}

export default MeetingRoom
