'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, RotateCcw, Play, Pause, CheckCircle, Smile, Meh, Frown, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { fetchAuthSession } from 'aws-amplify/auth'; // <--- Thêm import này
import Link from 'next/link';

// Interface (Giữ nguyên)
interface AnalysisResult {
    JobId: string;
    Status: 'PROCESSING' | 'FULL_DATA_READY' | 'COMPLETED';
    FinalEmotion?: string;
    Valence?: number;
    Arousal?: number;
    Transcript?: string;
    AudioUrl?: string;
}

export default function ReportDetailPage() {
    const params = useParams();
    const jobId = params.id as string;

    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- FETCH DATA (CÓ BẢO MẬT) ---
    useEffect(() => {
        const fetchData = async () => {
            if (!jobId) return;
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;

                // 1. Lấy Token (Vé mời)
                const session = await fetchAuthSession();
                const token = session.tokens?.idToken?.toString();

                if (!token) {
                    setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
                    setLoading(false);
                    return;
                }

                // 2. Gọi API với Header Authorization
                const res = await fetch(`${apiUrl}/fn_GetResults?jobId=${jobId}`, {
                    headers: {
                        'Authorization': token // <--- Đưa vé cho bảo vệ
                    }
                });

                if (res.status === 200) {
                    const data = await res.json();
                    setResult(data);
                } else if (res.status === 401) {
                    setError("Lỗi xác thực (401). Token không hợp lệ.");
                } else {
                    setError("Không tìm thấy báo cáo hoặc đang xử lý.");
                }
            } catch (err) {
                setError("Lỗi kết nối server.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [jobId]);

    // --- UI HELPERS (Giữ nguyên) ---
    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const renderEmotionBadge = (emotion?: string) => {
        const label = emotion?.split('(')[0].trim() || "Unknown";
        let color = "text-slate-600 bg-slate-100";
        let Icon = Meh;

        if (label.includes("HẠNH") || label.includes("HÀO") || label.includes("THƯ")) {
            color = "text-emerald-600 bg-emerald-50 border-emerald-200";
            Icon = Smile;
        } else if (label.includes("TỨC") || label.includes("BUỒN") || label.includes("CĂNG")) {
            color = "text-red-600 bg-red-50 border-red-200";
            Icon = Frown;
        }

        return (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${color} w-fit`}>
                <Icon className="h-5 w-5" />
                <span className="font-bold text-lg">{label}</span>
            </div>
        );
    };

    if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (error || !result) return <div className="flex h-[50vh] items-center justify-center text-red-500 gap-2"><AlertTriangle /> {error}</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Audio Player */}
            {result.AudioUrl && (
                <audio
                    ref={audioRef}
                    src={result.AudioUrl}
                    onEnded={() => setIsPlaying(false)}
                    onPause={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                />
            )}

            {/* Header Card */}
            <Card className="border-blue-200 bg-blue-50/30 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <CardContent className="pt-8 pb-8 text-center space-y-4">
                    <h1 className="text-2xl font-bold text-slate-800">Chi tiết Phân tích</h1>
                    <div className="flex justify-center">
                        {renderEmotionBadge(result.FinalEmotion)}
                    </div>

                    <div className="grid grid-cols-2 gap-8 max-w-md mx-auto mt-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Valence</div>
                            <div className="text-3xl font-mono font-bold text-slate-800">{result.Valence?.toFixed(2)}</div>
                            <Progress value={((result.Valence || 0) + 1) * 50} className="h-1.5 mt-2" />
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Arousal</div>
                            <div className="text-3xl font-mono font-bold text-slate-800">{result.Arousal?.toFixed(2)}</div>
                            <Progress value={((result.Arousal || 0) + 1) * 50} className="h-1.5 mt-2 bg-red-100" indicatorClassName="bg-red-500" />
                        </div>
                    </div>

                    {result.AudioUrl && (
                        <div className="pt-4">
                            <Button
                                onClick={toggleAudio}
                                className={`rounded-full px-6 ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                {isPlaying ? "Tạm dừng" : "Nghe lại Audio"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Transcript Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-500" /> Transcript & Chi tiết
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm max-h-[400px] overflow-y-auto">
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                            {result.Transcript || "Không có nội dung văn bản."}
                        </p>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-xs text-slate-400">Job ID: {result.JobId}</div>
                        <Link href="/upload">
                            <Button variant="outline">
                                <RotateCcw className="mr-2 h-4 w-4" /> Phân tích file khác
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}