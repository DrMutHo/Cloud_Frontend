'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp, confirmSignUp } from 'aws-amplify/auth';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<'SIGNUP' | 'CONFIRM'>('SIGNUP');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        code: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await signUp({
                username: formData.email,
                password: formData.password,
                options: {
                    userAttributes: {
                        email: formData.email,
                    },
                    autoSignIn: true,
                },
            });

            toast.success("Đã gửi mã xác thực!", {
                description: `Vui lòng kiểm tra email ${formData.email}`,
            });
            setStep('CONFIRM');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Đăng ký thất bại.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await confirmSignUp({
                username: formData.email,
                confirmationCode: formData.code
            });

            toast.success("Xác thực tài khoản thành công!", {
                description: "Đang chuyển hướng đến trang đăng nhập...",
                duration: 2000,
            });

            setTimeout(() => {
                router.push('/login?registered=true');
            }, 1500);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Mã xác nhận không đúng.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 px-4">
            <Card className="w-full max-w-md border-slate-200 shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">
                        {step === 'SIGNUP' ? 'Tạo tài khoản mới' : 'Xác thực Email'}
                    </CardTitle>
                    <CardDescription>
                        {step === 'SIGNUP'
                            ? 'Nhập email và mật khẩu để bắt đầu'
                            : `Chúng tôi đã gửi mã 6 số tới ${formData.email}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'SIGNUP' ? (
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Input id="email" type="email" placeholder="name@example.com" required value={formData.email} onChange={handleChange} className="pl-10" />
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <div className="relative">
                                    <Input id="password" type="password" required value={formData.password} onChange={handleChange} className="pl-10" />
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-500">Tối thiểu 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt.</p>
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                Đăng ký
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleConfirm} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Mã xác nhận (OTP)</Label>
                                <Input id="code" placeholder="123456" required value={formData.code} onChange={handleChange} className="text-center text-lg tracking-widest" />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                Xác nhận & Hoàn tất
                            </Button>
                        </form>
                    )}

                    <div className="mt-4 text-center text-sm">
                        Đã có tài khoản?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline font-medium">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}