'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'aws-amplify/auth';
import { toast } from 'sonner';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            console.log("Đang gửi yêu cầu đăng nhập tới Cognito...");

            const { isSignedIn, nextStep } = await signIn({
                username: formData.email,
                password: formData.password
            });

            console.log("Kết quả đăng nhập:", { isSignedIn, nextStep });

            if (isSignedIn) {
                toast.success("Đăng nhập thành công!", {
                    description: "Chào mừng bạn quay trở lại.",
                });
                router.push('/');
            } else {
                if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                    setError("Tài khoản cần đổi mật khẩu lần đầu. (Chức năng này chưa làm ở bản thô)");
                } else {
                    setError(`Cần thực hiện bước tiếp theo: ${nextStep.signInStep}`);
                }
            }

        } catch (err: any) {
            console.error("Lỗi đăng nhập:", err);
            toast.error("Đăng nhập thất bại");
            if (err.name === 'NotAuthorizedException') {
                setError("Email hoặc mật khẩu không chính xác.");
            } else if (err.name === 'UserNotFoundException') {
                setError("Tài khoản không tồn tại.");
            } else {
                setError(err.message || "Đã xảy ra lỗi kết nối.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 px-4 z-50 fixed inset-0">
            {/* Nền trang trí */}
            <div className="absolute inset-0 bg-grid-slate-200/[0.2] bg-[bottom_1px_center]" />

            <Card className="w-full max-w-md border-slate-200 shadow-xl z-10 bg-white/90 backdrop-blur">
                <CardHeader className="space-y-1 text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                            <User className="text-white h-6 w-6" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Đăng nhập Hệ thống</h2>
                    <p className="text-sm text-slate-500">Sử dụng tài khoản User Pool trong Cognito</p>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email / Username</Label>
                            <Input
                                id="email"
                                type="text"
                                placeholder="Nhập username hoặc email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="bg-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mật khẩu</Label>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="bg-white pr-10"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang kết nối AWS...
                                </>
                            ) : (
                                "Đăng nhập"
                            )}
                        </Button>

                        <div className="mt-4 text-center text-sm text-slate-600">
                            Chưa có tài khoản?{' '}
                            <a href="/register" className="text-blue-600 hover:underline font-medium">
                                Đăng ký miễn phí
                            </a>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}