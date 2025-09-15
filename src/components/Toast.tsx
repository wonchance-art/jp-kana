// src/components/Toast.tsx
'use client';

export function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-5 right-5 rounded-lg bg-black/80 text-white px-4 py-2 text-sm shadow">
      {text}
    </div>
  );
}