"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useTranscription } from "@/providers/transcript-provider"

export default function LiveTranscription() {
  const { state } = useTranscription()
  const recentTranscriptions = state.transcriptions.slice(-3) // Show last 3 transcriptions

  return (
    <div className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none">
      <AnimatePresence mode="popLayout">
        {recentTranscriptions.map((transcription) => (
          <motion.div
            key={transcription.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-black/75 text-white rounded-lg px-4 py-2 mb-2 max-w-2xl text-center"
          >
            <p className="text-sm">{transcription.text}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

