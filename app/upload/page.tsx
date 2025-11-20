'use client';

import React, { useState, useRef } from 'react';
import { CloudUpload, FileAudio, LogOut, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadData } from 'aws-amplify/storage';

export default function UploadPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [error, setError] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setError('');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleCardClick = () => {
        fileInputRef.current?.click();
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);
            setProgress(0);
            setError('');

            const uniqueFileName = `uploads/${Date.now()}-${file.name}`;

            const operation = uploadData({
                path: uniqueFileName,
                data: file,
                options: {
                    onProgress: ({ transferredBytes, totalBytes }) => {
                        if (totalBytes) {
                            const percent = Math.round((transferredBytes / totalBytes) * 100);
                            setProgress(percent);
                        }
                    },
                },
            });

            await operation.result;

            setUploading(false);
            setCompleted(true);
            console.log("Upload thành công:", uniqueFileName);

        } catch (err: any) {
            console.error("Lỗi Upload:", err);
            if (err.name === 'AccessDenied') {
                setError("Lỗi quyền truy cập (403). Hãy kiểm tra lại Identity Pool và IAM Policy.");
            } else {
                setError(`Lỗi: ${err.message || "Không thể kết nối tới S3"}`);
            }
            setUploading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setCompleted(false);
        setProgress(0);
        setUploading(false);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in zoom-in-95 duration-300">
                <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-emerald-600" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Tải lên hoàn tất!</h2>
                    <p className="text-slate-500 max-w-md">
                        File <strong>{file?.name}</strong> đã nằm an toàn trong kho dữ liệu.<br />
                        Hệ thống sẽ tự động kích hoạt để phân tích.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleReset}
                >
                    Tải lên file khác
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tải lên dữ liệu</h1>
                <p className="text-slate-500 mt-2">Chọn file âm thanh để trực tiếp tải lên.</p>
            </div>

            <Card
                className={`border-2 border-dashed transition-all duration-200 
          ${isDragging ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-slate-300 bg-white hover:bg-slate-50'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
            >
                <CardContent
                    className="flex flex-col items-center justify-center py-16 space-y-6 text-center cursor-pointer"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleCardClick}
                >
                    <div className="h-20 w-20 bg-slate-50 rounded-full shadow-sm flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">
                        <CloudUpload className={`h-10 w-10 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-slate-900">
                            {isDragging ? 'Thả file vào đây ngay' : 'Kéo thả hoặc Click để chọn file'}
                        </h3>
                        <p className="text-sm text-slate-500">Hỗ trợ MP3, WAV, M4A (Tối đa 1GB)</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="audio/*"
                        onChange={handleFileSelect}
                    />

                    {!file && (
                        <div className="mt-4">
                            <Button variant="outline" className="pointer-events-none" type="button">
                                <span>Chọn File từ máy tính</span>
                            </Button>
                        </div>
                    )}

                    {file && (
                        <div
                            className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-lg border border-slate-200 shadow-sm mt-4 animate-in fade-in zoom-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-2 bg-white rounded-md border border-slate-100">
                                <FileAudio className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors ml-2"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm animate-in fade-in">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {file && !uploading && (
                <div className="flex justify-end">
                    <Button onClick={handleUpload} size="lg" className="w-full md:w-auto px-8 bg-slate-900 hover:bg-slate-800">
                        Bắt đầu Upload
                    </Button>
                </div>
            )}

            {uploading && (
                <div className="space-y-3 bg-white p-6 rounded-lg border border-slate-200 shadow-sm animate-in fade-in">
                    <div className="flex justify-between text-sm font-medium text-slate-700">
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            Đang đẩy dữ liệu lên kho dữ liệu...
                        </span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-xs text-slate-400 text-center pt-1">
                        Kết nối bảo mật TLS tới {process.env.NEXT_PUBLIC_AWS_REGION}
                    </p>
                </div>
            )}
        </div>
    );
}