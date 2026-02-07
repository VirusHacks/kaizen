"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Props = {
  totalLeads: number;
};

export default function OfferMessage({ totalLeads }: Props) {
  const [offerMessage, setOfferMessage] = useState(
    "🎉 Special Offer! Get 20% off on your first purchase. Limited time only!"
  );
  const [sendToAll, setSendToAll] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!offerMessage.trim()) {
      toast.error("Please enter an offer message");
      return;
    }

    if (sendToAll) {
      setIsSending(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Offer message sent to all ${totalLeads} contacts!`);
      setIsSending(false);
    } else {
      toast.info("Offer message ready. Select 'Send to all contacts' to send.");
    }
  };

  return (
    <Card className="bg-[#0a0a0a] border border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            New Offer Message
          </CardTitle>
          <CardDescription className="text-gray-400 text-sm mt-1">
            Create and send a special offer to your leads
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-message" className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Offer Message
            </Label>
            <Textarea
              id="offer-message"
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder="Enter your offer message here..."
              className="bg-[#0a0a0a] border-gray-700 text-white placeholder:text-gray-500 min-h-[120px] resize-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-3 pt-3 border-t border-gray-800 p-3 rounded-lg bg-[#0a0a0a] border border-gray-800">
            <Checkbox
              id="send-to-all"
              checked={sendToAll}
              onCheckedChange={(checked) => setSendToAll(checked as boolean)}
              className="border-gray-600 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
            />
            <Label
              htmlFor="send-to-all"
              className="text-sm font-medium text-gray-300 cursor-pointer flex-1"
            >
              Send offer message to all <span className="font-bold text-purple-400">{totalLeads}</span> contacts
            </Label>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending}
            className="w-full bg-[#0a0a0a] border-gray-700 text-white hover:bg-gray-900 hover:border-purple-500/50 transition-all"
          >
              {isSending ? (
                <>
                  <div className="animate-spin">
                    <Send className="h-4 w-4 mr-2" />
                  </div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {sendToAll ? `Send to All ${totalLeads} Contacts` : "Save Offer Message"}
                </>
              )}
            </Button>
        </CardContent>
      </Card>
  );
}

