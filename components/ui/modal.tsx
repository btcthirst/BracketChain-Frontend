"use client";

import { X } from "lucide-react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: number;
}

export function Modal({ open, onClose, children, maxWidth = 400 }: ModalProps) {
    if (!open) return null;
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(4px)",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "rgba(13,15,24,0.98)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                    width: "100%",
                    maxWidth,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    padding: 24,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

interface ModalHeaderProps {
    children: React.ReactNode;
    onClose: () => void;
    disabled?: boolean;
}

Modal.Header = function ModalHeader({ children, onClose, disabled }: ModalHeaderProps) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
            <button
                onClick={onClose}
                disabled={disabled}
                style={{
                    background: "none",
                    border: "none",
                    cursor: disabled ? "not-allowed" : "pointer",
                    color: "rgba(240,241,245,0.3)",
                    transition: "color 0.15s",
                    padding: 4,
                    flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.color = "rgba(240,241,245,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(240,241,245,0.3)"; }}
            >
                <X style={{ width: 18, height: 18 }} />
            </button>
        </div>
    );
};

Modal.Actions = function ModalActions({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 10 }}>
            {children}
        </div>
    );
};
