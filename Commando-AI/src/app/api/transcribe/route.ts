export const runtime = "edge";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Increase payload size limit
export const maxDuration = 300; // 5 minutes timeout

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
  
export async function POST(req: NextRequest) {
  if (!openai.apiKey) {
    console.error("OpenAI API key is missing");
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    console.log("Receiving audio file...");
    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob;
    const meetingId = formData.get("meetingId") as string;

    if (!audioFile) {
      console.error("No audio file provided");
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!meetingId) {
      console.error("No meeting ID provided");
      return NextResponse.json({ error: "No meeting ID provided" }, { status: 400 });
    }

    console.log("Sending audio file to OpenAI for transcription...");
    const fileBuffer = await audioFile.arrayBuffer();
    const file = new File([fileBuffer], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "text",
      language: "en",
    });

    if (!transcription) {
      throw new Error("No transcription received from OpenAI");
    }

    console.log("Transcription received:", transcription);

    return NextResponse.json({ transcription });
  } catch (error: any) {
    console.error("Error in transcription route:", error);

    if (error.response) {
      return NextResponse.json(
        { error: "OpenAI API error", details: error.response.data },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: "Transcription failed", message: error.message },
      { status: 500 }
    );
  }
}
