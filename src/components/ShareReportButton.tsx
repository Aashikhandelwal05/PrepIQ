import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareReportModal from "./ShareReportModal";
import { createPrepShareLink, createMockShareLink } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ShareReportButtonProps {
  type: "prep" | "mock";
  sessionId?: string;
  attemptId?: string;
  userId: string;
  onDownloadPdf?: () => void;
}

export default function ShareReportButton({
  type,
  sessionId,
  attemptId,
  userId,
  onDownloadPdf,
}: ShareReportButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateShare = async (options: { password?: string; expirationDays?: number }): Promise<string> => {
    if (type === "prep" && sessionId) {
      const result = await createPrepShareLink(userId, sessionId, options);
      return result.url;
    }
    if (type === "mock" && attemptId) {
      const result = await createMockShareLink(userId, attemptId, options);
      return result.url;
    }
    throw new Error("Missing required identifiers for share link");
  };

  const handleDownloadPdf = () => {
    if (onDownloadPdf) {
      onDownloadPdf();
    } else {
      window.print();
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Share2 className="w-4 h-4" />
        Share Report
      </Button>
      <ShareReportModal
        open={open}
        onOpenChange={setOpen}
        onCreateShare={handleCreateShare}
        onDownloadPdf={handleDownloadPdf}
        type={type}
      />
    </>
  );
}
