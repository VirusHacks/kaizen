export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages, audioTranscript } = await req.json();
    let query = audioTranscript || messages[messages.length - 1].content;

    // Send the request to the webhook
    const webhookResponse = await fetch("https://virushacks.app.n8n.cloud/webhook-test/aichat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (webhookResponse.ok) {
      const data = await webhookResponse.json();
      return new Response(JSON.stringify({ role: "assistant", content: data.output }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      console.error("Webhook error:", await webhookResponse.text());
      return new Response(JSON.stringify({ error: "An error occurred while processing the request" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("API route error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}