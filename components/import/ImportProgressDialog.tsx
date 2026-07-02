"use client"

import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import type { ImportProgressEvent } from "@/types/import.type"

interface ImportProgressDialogProps {
    open: boolean
    progress: ImportProgressEvent
}

export function ImportProgressDialog({ open, progress }: ImportProgressDialogProps) {
    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Importing entries</DialogTitle>
                    <DialogDescription>
                        {progress.status === "importing" ? `Uploading ${progress.completed} / ${progress.total}` : "Preparing the bulk import"}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {progress.currentDate ? `Processing ${progress.currentDate}` : "Preparing import"}
                    </div>
                    <Progress value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
