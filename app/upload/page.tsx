'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CloudUpload, FileAudio, LogOut, Loader2, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadData } from 'aws-amplify/storage';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AnalysisResult {
    JobId: string;
    Status: string;
}

export default function UploadPage() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'ERROR'>('IDLE');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [jobId, setJobId] = useState<string | null>(null);
    const [retryCountDisplay, setRetryCountDisplay] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function getUser() {
            try {
                const { username } = await getCurrentUser();
                setUserId(username);
            } catch (e) {
                setUserId("guest");
            }
        }
        getUser();
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        let retryCount = 0;
        const MAX_RETRIES = 100;

        const checkStatus = async () => {
            if (status !== 'PROCESSING' || !jobId) return;

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                if (!apiUrl) return;

                const session = await fetchAuthSession();
                const token = session.tokens?.idToken?.toString();

                const res = await fetch(`${apiUrl}/fn_GetResults?jobId=${jobId}`, {
                    method: 'GET',
                    headers: token ? { 'Authorization': token } : {}
                });

                if (res.status === 200) {
                    const data: AnalysisResult = await res.json();

                    if (data.Status === 'FULL_DATA_READY') {
                        setStatus('COMPLETED');
                        toast.success("Phân tích hoàn tất! Đang chuyển trang...");
                        setTimeout(() => {
                            router.push(`/report/${jobId}`);
                        }, 1000);
                    } else {
                        retryCount++;
                        setRetryCountDisplay(retryCount);
                        console.log(`Job đang xử lý... Status: ${data.Status}`);

                        if (retryCount > MAX_RETRIES) {
                            setError("Hết thời gian chờ. Vui lòng kiểm tra lại sau.");
                            setStatus('ERROR');
                        }
                    }
                } else if (res.status === 404) {
                    retryCount++;
                    setRetryCountDisplay(retryCount);
                } else if (res.status === 401 || res.status === 403) {
                    setError("Lỗi quyền truy cập (401/403).");
                    setStatus('ERROR');
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        if (status === 'PROCESSING') {
            intervalId = setInterval(checkStatus, 3000);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [status, jobId, router]);

    const handleUpload = async () => {
        if (!file || !userId) return;
        try {
            setStatus('UPLOADING');
            setProgress(0);
            setError('');
            setRetryCountDisplay(0);

            const timestamp = Date.now();
            const fileNameNoExt = file.name.replace(/\.[^/.]+$/, "");

            const cleanName = fileNameNoExt.replace(/[^a-zA-Z0-9._-]/g, '_');
            const cleanUserId = userId.replace(/[^a-zA-Z0-9._-]/g, '_');

            const expectedJobId = `${cleanUserId}_${timestamp}_${cleanName}`;

            const s3Key = `${expectedJobId}.mp3`;

            setJobId(expectedJobId);

            console.log(`Uploading to S3 (Root): ${s3Key}`);

            const operation = uploadData({
                path: s3Key,
                data: file,
                options: {
                    onProgress: ({ transferredBytes, totalBytes }) => {
                        if (totalBytes) setProgress(Math.round((transferredBytes / totalBytes) * 100));
                    },
                },
            });

            await operation.result;
            setStatus('PROCESSING');
            toast.info("Upload xong. Đang phân tích...");

        } catch (err: any) {
            setError(err.message || "Lỗi upload");
            setStatus('ERROR');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(''); }
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tải lên Audio</h1>
                <p className="text-slate-500 mt-2">Hệ thống Fusion AI sẽ phân tích cả văn bản và giọng nói.</p>
            </div>

            <Card className={`border-2 border-dashed transition-all duration-200 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'} ${status !== 'IDLE' && status !== 'ERROR' ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-50 cursor-pointer'} ${error ? 'border-red-300 bg-red-50' : ''}`}>
                <CardContent className="flex flex-col items-center justify-center py-16 space-y-6 text-center" onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                    {status === 'PROCESSING' ? (
                        <div className="flex flex-col items-center gap-4"><div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center animate-pulse"><Activity className="h-12 w-12 text-blue-600 animate-bounce" /></div></div>
                    ) : (
                        <div className="h-20 w-20 bg-slate-50 rounded-full shadow-sm flex items-center justify-center border border-slate-100 group-hover:bg-white"><CloudUpload className="h-10 w-10 text-slate-400" /></div>
                    )}

                    <div className="space-y-2">
                        {status === 'PROCESSING' ? (
                            <><h3 className="text-xl font-semibold text-blue-700">Đang xử lý...</h3><p className="text-sm text-blue-600">Vui lòng đợi trong giây lát ({retryCountDisplay})...</p></>
                        ) : (
                            <><h3 className="text-xl font-semibold text-slate-900">{isDragging ? 'Thả file vào đây ngay' : 'Kéo thả hoặc Click để chọn file'}</h3><p className="text-sm text-slate-500">Hỗ trợ MP3, WAV</p></>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="audio/*" onChange={handleFileSelect} />
                    {file && status === 'IDLE' && (
                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-lg border border-slate-200 shadow-sm mt-4 z-10" onClick={(e) => e.stopPropagation()}>
                            <FileAudio className="h-6 w-6 text-blue-600" /><div className="text-left"><p className="text-sm font-medium text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-2 hover:text-red-500"><LogOut className="h-4 w-4" /></button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {status === 'UPLOADING' && (
                <div className="space-y-2 animate-in fade-in"><div className="flex justify-between text-sm font-medium text-slate-700"><span>Đang tải lên S3...</span><span>{progress}%</span></div><Progress value={progress} className="h-3" /></div>
            )}

            {file && status === 'IDLE' && (
                <div className="flex justify-end"><Button onClick={handleUpload} size="lg" className="w-full md:w-auto px-8 bg-slate-900">Bắt đầu Phân tích</Button></div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2 animate-in fade-in"><AlertTriangle className="h-5 w-5" />{error}</div>
            )}
        </div>
    );
}