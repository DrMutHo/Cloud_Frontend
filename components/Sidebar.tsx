'use client';

import React, { useState } from 'react';
import {
    LayoutDashboard,
    CloudUpload,
    FileText,
    LogOut,
    Settings,
    ChevronRight,
    Menu
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    return (
        <aside
            className={`${isOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex flex-col border-r border-slate-200 bg-white h-screen sticky top-0 left-0 z-50`}
        >
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
                {isOpen && (
                    <span className="font-bold text-lg tracking-tight text-slate-800">
                        CloudAnalyze<span className="text-blue-600">.ai</span>
                    </span>
                )}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                >
                    {isOpen ? <ChevronRight className="h-4 w-4 rotate-180" /> : <Menu className="h-4 w-4" />}
                </button>
            </div>

            <nav className="flex-1 p-2 space-y-1 mt-2">
                <NavItem
                    href="/"
                    icon={<LayoutDashboard />}
                    label="Dashboard"
                    isActive={pathname === '/'}
                    collapsed={!isOpen}
                />
                <NavItem
                    href="/upload"
                    icon={<CloudUpload />}
                    label="Tải lên File"
                    isActive={pathname === '/upload'}
                    collapsed={!isOpen}
                />
                <NavItem
                    href="/reports"
                    icon={<FileText />}
                    label="Báo cáo"
                    isActive={pathname === '/reports'}
                    collapsed={!isOpen}
                />
            </nav>

            <div className="p-2 border-t border-slate-100 mb-2">
                <NavItem
                    href="/settings"
                    icon={<Settings />}
                    label="Cấu hình"
                    isActive={pathname === '/settings'}
                    collapsed={!isOpen}
                />
                <button
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-red-600 hover:bg-red-50`}
                    title={!isOpen ? "Đăng xuất" : ""}
                >
                    <LogOut className="h-5 w-5" />
                    {isOpen && <span>Đăng xuất</span>}
                </button>
            </div>
        </aside>
    );
}

function NavItem({ href, icon, label, isActive, collapsed, variant = 'default' }: any) {
    return (
        <Link
            href={href}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors 
        ${isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
      `}
            title={collapsed ? label : ''}
        >
            {React.cloneElement(icon, { className: "h-5 w-5" })}
            {!collapsed && <span>{label}</span>}
        </Link>
    );
}