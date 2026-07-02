"use client"

import { useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ExcelUploadCardProps {
    onFileSelected: (file: File) => Promise<void> | void
    isLoading?: boolean
    error?: string | null
    acceptedFileName?: string | null
}

const uploadSchema = z.object({
    file: z.custom<File>((value) => value instanceof File, "Please choose a valid Excel file."),
})

type UploadFormValues = z.infer<typeof uploadSchema>

export function ExcelUploadCard({ onFileSelected, isLoading = false, error, acceptedFileName }: ExcelUploadCardProps) {
    const [isDragging, setIsDragging] = useState(false)
    const { setValue, formState: { errors } } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadSchema),
        defaultValues: { file: undefined },
    })

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles.at(0)
        if (!file) return
        setValue("file", file, { shouldValidate: true })
        setIsDragging(false)
        await onFileSelected(file)
    }, [onFileSelected, setValue])

    const { getRootProps, getInputProps, open } = useDropzone({
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
        multiple: false,
        noClick: true,
        onDropAccepted: () => setIsDragging(false),
        onDropRejected: () => setIsDragging(false),
        onDragEnter: () => setIsDragging(true),
        onDragLeave: () => setIsDragging(false),
        onDrop: onDrop,
    })

    return (
        <Card className="border-border/80 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Upload Excel Workbook
                </CardTitle>
                <CardDescription>Upload a monthly handwritten-entry sheet in .xlsx format to preview and import it.</CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    {...getRootProps({
                        className: cn(
                            "rounded-2xl border-2 border-dashed p-8 text-center transition-all",
                            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/5"
                        ),
                    })}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                    <p className="text-base font-medium text-foreground">Drag & drop your Excel file here</p>
                    <p className="mt-2 text-sm text-muted-foreground">or</p>
                    <Button type="button" variant="outline" className="mt-4" onClick={open} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Choose File
                    </Button>
                    <p className="mt-4 text-xs text-muted-foreground">Supported: .xlsx only · Max size: 10 MB</p>
                </div>

                {errors.file?.message ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning">
                        <AlertCircle className="h-4 w-4" />
                        {errors.file.message}
                    </div>
                ) : null}

                {acceptedFileName ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        {acceptedFileName}
                    </div>
                ) : null}

                {error ? (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
