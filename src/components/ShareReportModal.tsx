import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Share2, FileDown, Link2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateShare: (options: { password?: string; expirationDays?: number }) => Promise<string>;
  onDownloadPdf: () => void;
  type: "prep" | "mock";
}

export default function ShareReportModal({ open, onOpenChange, onCreateShare, onDownloadPdf, type }: ShareReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [protectWithPassword, setProtectWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [setExpiration, setSetExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const { toast } = useToast();

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      const url = await onCreateShare({
        password: protectWithPassword ? password : undefined,
        expirationDays: setExpiration ? expirationDays : undefined,
      });
      setShareUrl(url);
      toast({ title: "Share link created!", description: "Link is ready to copy." });
    } catch (error) {
      toast({
        title: "Failed to create share link",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Copied!", description: "Link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setCopied(false);
    setPassword("");
    setProtectWithPassword(false);
    setSetExpiration(false);
    setExpirationDays(7);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {type === "prep" ? "Prep Session" : "Mock Interview"} Report
          </DialogTitle>
          <DialogDescription>
            Share your results with mentors, peers, or career counsellors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!shareUrl ? (
            <>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={onDownloadPdf}>
                <FileDown className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">Download as PDF</p>
                  <p className="text-xs text-muted-foreground">Formatted A4 report with scores and analysis</p>
                </div>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-protect" className="cursor-pointer">Password protect</Label>
                  <Switch id="password-protect" checked={protectWithPassword} onCheckedChange={setProtectWithPassword} />
                </div>
                {protectWithPassword && (
                  <Input
                    type="text"
                    placeholder="Enter a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="set-expiration" className="cursor-pointer">Set expiration</Label>
                  <Switch id="set-expiration" checked={setExpiration} onCheckedChange={setSetExpiration} />
                </div>
                {setExpiration && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}

                <Button className="w-full gap-2" onClick={handleCreateLink} disabled={loading || (protectWithPassword && !password)}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {loading ? "Creating..." : "Create Shareable Link"}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="flex-1 text-sm" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Link2 className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {protectWithPassword && "Password protected. "}
                {setExpiration && `Expires in ${expirationDays} day(s). `}
                Anyone with this link can view the report.
              </p>
              <Button variant="ghost" className="w-full" onClick={handleCreateLink}>
                Generate New Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
