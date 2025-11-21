'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileAudio, CheckCircle, AlertCircle, Loader2, RefreshCw, Play, Pause,
  Smile, Frown, Meh, User, ChevronRight, Clock, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';

const formatJobIdToName = (rawId: string) => {
  if (!rawId) return "Unknown File";
  const parts = rawId.split('_');

  const timestampIndex = parts.findIndex(p => /^\d{13}$/.test(p));

  if (timestampIndex !== -1 && timestampIndex < parts.length - 1) {
    let name = parts.slice(timestampIndex + 1).join('_');

    if (/^[_]+$/.test(name) || name.trim() === '') {
      const date = new Date(parseInt(parts[timestampIndex]));
      return `Audio ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')} (${date.getDate()}/${date.getMonth() + 1})`;
    }
    return name;
  }
  return rawId.length > 20 ? rawId.substring(0, 15) + '...' : rawId;
};

interface AnalysisItem {
  JobId: string;
  Timestamp: string;
  Status: 'PROCESSING' | 'FULL_DATA_READY' | 'COMPLETED';
  FinalEmotion?: string;
  Valence?: number;
  Arousal?: number;
  AudioUrl?: string;
}

interface ApiResponse {
  items: AnalysisItem[];
  nextToken?: string;
}

const useCurrentUser = () => {
  const [user, setUser] = useState<string | null>(null);
  const [displayUser, setDisplayUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      try {
        const { username } = await getCurrentUser();
        setDisplayUser(username);
        const cleanName = username.replace(/[^a-zA-Z0-9._-]/g, '_');
        const backendUserId = cleanName.split('_')[0];
        setUser(backendUserId);
      } catch (err) {
        console.log("Chưa đăng nhập");
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);
  return { userId: user, displayUser, loading };
};

const fetcher = async ([url, userId]: [string, string]) => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (!token) throw new Error("Phiên hết hạn");

    const res = await fetch(`${url}?userId=${userId}&limit=20`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error('Lỗi API');
    return res.json();
  } catch (error) {
    console.error("Fetcher:", error);
    throw error;
  }
};

export default function Dashboard() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const { userId, displayUser, loading: userLoading } = useCurrentUser();

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const { data, error, isLoading, mutate, isValidating } = useSWR<ApiResponse>(
    apiUrl && userId ? [`${apiUrl}/fn_GetResults`, userId] : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false
    }
  );

  const { stats, chartData, recentFiles } = useMemo(() => {
    const items = data?.items || [];
    const total = items.length;
    const completed = items.filter(i => i.Status === 'FULL_DATA_READY' || i.Status === 'COMPLETED').length;
    const processing = total - completed;

    const emotionCounts: Record<string, number> = {};
    items.forEach(item => {
      if (item.FinalEmotion) {
        const label = item.FinalEmotion.split('(')[0].trim();
        emotionCounts[label] = (emotionCounts[label] || 0) + 1;
      }
    });

    const sentimentChartData = Object.keys(emotionCounts).map(key => ({
      name: key, value: emotionCounts[key], color: getColorForEmotion(key)
    }));

    const valenceChartData = items
      .filter(i => i.Status === 'FULL_DATA_READY' || i.Status === 'COMPLETED')
      .slice(0, 5)
      .map(item => ({
        name: formatJobIdToName(item.JobId).substring(0, 12) + '...',
        fullName: formatJobIdToName(item.JobId),
        valence: item.Valence ? parseFloat(item.Valence.toFixed(2)) : 0,
        arousal: item.Arousal ? parseFloat(item.Arousal.toFixed(2)) : 0,
      }));

    return {
      stats: { total, completed, processing },
      recentFiles: items,
      chartData: { sentiment: sentimentChartData, valence: valenceChartData }
    };
  }, [data]);

  const toggleAudio = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
    } else {
      setPlayingUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }
  };

  const handleRowClick = (jobId: string) => {
    router.push(`/report/${jobId}`);
  };

  const renderActionColumn = (file: AnalysisItem) => {
    const isCompleted = file.Status === 'FULL_DATA_READY' || file.Status === 'COMPLETED';

    if (file.AudioUrl) {
      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full hover:bg-blue-100 hover:text-blue-600 ${playingUrl === file.AudioUrl ? 'bg-blue-100 text-blue-600' : ''}`}
            onClick={(e) => toggleAudio(e, file.AudioUrl!)}
            title="Nghe nhanh"
          >
            {playingUrl === file.AudioUrl ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400" title="Xem chi tiết">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (isCompleted) {
      return (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 h-8 px-2 text-xs" onClick={(e) => {
            e.stopPropagation();
            router.push(`/report/${file.JobId}`);
          }}>
            <FileText className="h-3 w-3 mr-1" /> Xem chi tiết
          </Button>
        </div>
      );
    }

    return <span className="text-amber-500 text-xs flex items-center justify-end gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Đang xử lý</span>;
  };

  if (userLoading || (isLoading && !data)) return (
    <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="text-slate-500">Đang tải dữ liệu...</p>
    </div>
  );

  if (error) return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-red-500 gap-2">
      <AlertCircle className="h-10 w-10" />
      <p>Không thể tải dữ liệu. Vui lòng kiểm tra kết nối.</p>
      <Button variant="outline" onClick={() => mutate()}>Thử lại</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <audio ref={audioRef} onEnded={() => setPlayingUrl(null)} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard cảm Xúc</h1>
          <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
            <User className="h-4 w-4" />
            <span>{displayUser}</span>
            {isValidating && (
              <span className="flex items-center text-blue-600 ml-2 animate-pulse">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Đang đồng bộ...
              </span>
            )}
          </div>
        </div>
        <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => mutate()} disabled={isValidating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
          {isValidating ? "Đang cập nhật" : "Cập nhật ngay"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Tổng File" value={stats.total} icon={<FileAudio className="h-4 w-4 text-slate-500" />} desc="File của bạn" />
        <SummaryCard title="Hoàn Tất" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} desc="Đã phân tích xong" />
        <SummaryCard title="Đang Xử Lý" value={stats.processing} icon={<Loader2 className="h-4 w-4 text-amber-500 animate-spin" />} desc="Chờ AI chạy" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader><CardTitle>Phân bố cảm xúc</CardTitle></CardHeader>
          <CardContent>
            {stats.completed > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.sentiment} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.sentiment.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip /><Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[300px] flex items-center justify-center text-slate-400 border border-dashed rounded-lg">Chưa có dữ liệu</div>}
          </CardContent>
        </Card>

        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Biểu đồ Valence & Arousal</CardTitle>
            <CardDescription>5 file gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.completed > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.valence} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[-1, 1]} hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Legend />
                    <Bar dataKey="valence" name="Valence (Cảm xúc)" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar dataKey="arousal" name="Arousal (Kích thích)" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-[300px] flex items-center justify-center text-slate-400 border border-dashed rounded-lg">Chưa có dữ liệu</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lịch sử phân tích</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Tên File</th>
                  <th className="px-4 py-3 font-medium">Thời gian</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Kết quả</th>
                  <th className="px-4 py-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.length > 0 ? (
                  recentFiles.map((file, index) => (
                    <tr
                      key={index}
                      onClick={() => handleRowClick(file.JobId)}
                      className="border-b last:border-0 hover:bg-slate-100 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-4 font-medium text-slate-900 max-w-[250px] truncate">
                        <div className="flex items-center gap-2">
                          <FileAudio className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                          <span title={formatJobIdToName(file.JobId)}>{formatJobIdToName(file.JobId)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {file.Timestamp ? new Date(file.Timestamp).toLocaleDateString() : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={file.Status} />
                      </td>
                      <td className="px-4 py-4">
                        <EmotionBadge emotion={file.FinalEmotion} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        {renderActionColumn(file)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Chưa có dữ liệu nào.
                      <Button variant="link" onClick={() => router.push('/upload')}>Tải lên ngay</Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- HELPER COMPONENTS ---
function getColorForEmotion(label: string) {
  const l = label.toUpperCase();
  if (l.includes("HẠNH") || l.includes("HÀO")) return "#10b981";
  if (l.includes("BÌNH") || l.includes("THƯ")) return "#3b82f6";
  if (l.includes("TỨC") || l.includes("CĂNG")) return "#ef4444";
  if (l.includes("BUỒN") || l.includes("CHÁN")) return "#6366f1";
  return "#94a3b8";
}
function SummaryCard({ title, value, icon, desc }: any) {
  return <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>{icon}</CardHeader><CardContent><div className="text-2xl font-bold">{value}</div><p className="text-xs text-slate-500 mt-1">{desc}</p></CardContent></Card>;
}
function StatusBadge({ status }: { status: string }) {
  return status === 'FULL_DATA_READY' || status === 'COMPLETED'
    ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoàn tất</Badge>
    : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Đang xử lý</Badge>;
}
function EmotionBadge({ emotion }: { emotion?: string }) {
  if (!emotion) return <span className="text-slate-400">-</span>;
  const label = emotion.split('(')[0].trim();
  let icon = <Meh className="h-3 w-3 mr-1" />;
  let colorClass = "text-slate-700 bg-slate-100";
  if (label.includes("HẠNH") || label.includes("HÀO")) { icon = <Smile className="h-3 w-3 mr-1" />; colorClass = "text-emerald-700 bg-emerald-100"; }
  else if (label.includes("TỨC") || label.includes("BUỒN") || label.includes("CHÁN")) { icon = <Frown className="h-3 w-3 mr-1" />; colorClass = "text-red-700 bg-red-100"; }
  else if (label.includes("BÌNH") || label.includes("THƯ")) { icon = <Smile className="h-3 w-3 mr-1" />; colorClass = "text-blue-700 bg-blue-100"; }
  return <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${colorClass}`}>{icon} {label}</span>;
}