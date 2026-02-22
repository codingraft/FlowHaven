"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import GraphCanvas from "./_components/GraphCanvas";

export default function GraphPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-sm text-slate-400 dark:text-slate-500">Loading graph...</div>
            </div>
        );
    }

    return createPortal(
        <div className="fixed inset-0 md:left-64 top-14 z-0 bg-slate-50 dark:bg-[#0F172A]">
            <GraphCanvas />
        </div>,
        document.body
    );
}
