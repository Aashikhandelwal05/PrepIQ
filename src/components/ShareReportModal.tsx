import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Share2, Loader2, Trash2 } from "lucide-react";
import type { SharedReport, CreateSharedReportInput } from "@/lib/store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  attemptId?: string;
  reportType: "prep" | "mock";
  userId: string;
  reports: SharedReport[];
  creating: boolean;
  onCreateReport: (input: CreateSharedReportInput) => Promise<SharedReport>;
  onDeleteReport: (id: string) => Promise<void>;
  onDownloadPdf: () => void;
}

export default function ShareReportModal({
  open, onOpenChange, sessionId, attemptId, reportType,
  userId, reports, creating, onCreateReport, onDeleteReport, onDownloadPdf,
}: Props) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");

  const activeReports = reports.filter((r) =>
    reportType === "prep" ? r.sessionId === sessionId : r.attemptId === attemptId
  );

  const handleCreate = async () => {
    try {
      const input: CreateSharedReportInput = { reportType };
      if (sessionId) input.sessionId = sessionId;
      if (attemptId) input.attemptId = attemptId;
      if (password.trim()) input.password = password.trim();
      if (expiresInHours) input.expiresInHours = parseInt(expiresInHours, 10);
      const report = await onCreateReport(input);
      await navigator.clipboard.writeText(`${window.location.origin}/shared/prep/${report.token}`);
      toast({ title: "Link copied!", description: "The shareable link has been copied to your clipboard." });
      setPassword("");
      setExpiresInHours("");
    } catch {
      toast({ title: "Failed to create share link", variant: "destructive" });
    }
  };

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/shared/prep/${token}`);
    toast({ title: "Link copied!", description: "Shareable link copied to clipboard." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Share Report
          </DialogTitle>
          <DialogDescription>Download as PDF or create a shareable link.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={onDownloadPdf} className="w-full gradient-primary text-primary-foreground" variant="default">
            <Download className="w-4 h-4 mr-2" /> Download as PDF
          </Button>

          <div className="flex gap-2 border-b border-border">
            <button onClick={() => setActiveTab("create")} className={`pb-2 text-sm font-medium ${activeTab === "create" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>Create Link</button>
            <button onClick={() => setActiveTab("manage")} className={`pb-2 text-sm font-medium ${activeTab === "manage" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground"}`}>Manage Links ({activeReports.length})</button>
          </div>

          {activeTab === "create" && (
            <div className="space-y-3">
              <div>
                <Label>Password protection (optional)</Label>
                <Input type="password" placeholder="Leave empty for public access" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>Expiration</Label>
                <Select value={expiresInHours} onValueChange={setExpiresInHours}>
                  <SelectTrigger><SelectValue placeholder="Never" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Never</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                Create & Copy Link
              </Button>
            </div>
          )}

          {activeTab === "manage" && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active share links.</p>
              ) : (
                activeReports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">{window.location.origin}/shared/prep/{r.token.slice(0, 16)}...</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {r.hasPassword ? "🔒 " : ""}
                        {r.expiresAt ? `Expires ${new Date(r.expiresAt).toLocaleDateString()}` : "No expiry"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(r.token)}><Copy className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteReport(r.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
