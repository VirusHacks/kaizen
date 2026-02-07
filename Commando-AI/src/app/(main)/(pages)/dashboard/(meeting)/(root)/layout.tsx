import { ReactNode } from 'react';

import StreamVideoProvider from '@/providers/StreamClientProvider';
import Sidebar from '@/components/sidebar/index';
import type { Metadata } from "next"
import "@stream-io/video-react-sdk/dist/css/styles.css"
import { Urbanist } from "next/font/google"
import { cn } from "@/lib/utils"
import { TranscriptionProvider } from '@/providers/transcript-provider';

const urbanist = Urbanist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-urbanist",
})

export const metadata: Metadata = {
  title: "Commando AI",
  description: "Commando AI",
  icons: ["/icons/logo.png"],
}

const layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className={cn("font-sans", urbanist.variable)}>
      <TranscriptionProvider>
      <StreamVideoProvider>{children}</StreamVideoProvider>
      </TranscriptionProvider>
    </main>
  )
}

export default layout

