"use client"

import { createContext, useContext, useReducer, type ReactNode } from "react"

interface Transcription {
  id: string
  text: string
  timestamp: number
}

interface TranscriptionState {
  transcriptions: Transcription[]
  fullText: string
}

type TranscriptionAction =
  | { type: "ADD_TRANSCRIPTION"; payload: string }
  | { type: "CLEAR_TRANSCRIPTIONS" }
  | { type: "SAVE_TO_FILE" }

const TranscriptionContext = createContext<{
  state: TranscriptionState
  addTranscription: (text: string) => void
  clearTranscriptions: () => void
  saveToFile: () => void
} | null>(null)

function transcriptionReducer(state: TranscriptionState, action: TranscriptionAction): TranscriptionState {
  switch (action.type) {
    case "ADD_TRANSCRIPTION":
      const newTranscription = {
        id: Date.now().toString(),
        text: action.payload,
        timestamp: Date.now(),
      }
      return {
        ...state,
        transcriptions: [...state.transcriptions, newTranscription],
        fullText: state.fullText + " " + action.payload,
      }

    case "CLEAR_TRANSCRIPTIONS":
      return {
        transcriptions: [],
        fullText: "",
      }

    default:
      return state
  }
}

export function TranscriptionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(transcriptionReducer, {
    transcriptions: [],
    fullText: "",
  })

  const addTranscription = (text: string) => {
    dispatch({ type: "ADD_TRANSCRIPTION", payload: text })
  }

  const clearTranscriptions = () => {
    dispatch({ type: "CLEAR_TRANSCRIPTIONS" })
  }

  const saveToFile = () => {
    try {
      const blob = new Blob([state.fullText], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `meeting-transcript-${new Date().toISOString()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error saving transcription:", error)
    }
  }

  return (
    <TranscriptionContext.Provider
      value={{
        state,
        addTranscription,
        clearTranscriptions,
        saveToFile,
      }}
    >
      {children}
    </TranscriptionContext.Provider>
  )
}

export function useTranscription() {
  const context = useContext(TranscriptionContext)
  if (!context) {
    throw new Error("useTranscription must be used within a TranscriptionProvider")
  }
  return context
}

