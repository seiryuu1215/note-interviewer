"use client";

import { useRef, useCallback } from "react";

type ImageUploadProps = {
  onImageAdd: (base64: string) => void;
  disabled: boolean;
};

const MAX_LONG_SIDE = 1024;

function resizeImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const longSide = Math.max(width, height);

      // リサイズ不要
      if (longSide <= MAX_LONG_SIDE) {
        resolve(dataUrl);
        return;
      }

      const scale = MAX_LONG_SIDE / longSide;
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context の取得に失敗しました"));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // 元の形式を維持（JPEG/PNG/WebP）
      const mimeMatch = dataUrl.match(/^data:(image\/[^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const quality = mimeType === "image/png" ? undefined : 0.85;

      resolve(canvas.toDataURL(mimeType, quality));
    };
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = dataUrl;
  });
}

export default function ImageUpload({ onImageAdd, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else {
              reject(new Error("FileReader の結果が不正です"));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const resized = await resizeImage(dataUrl);
        onImageAdd(resized);
      } catch (err) {
        console.error("画像の処理に失敗:", err);
      }

      // 同じファイルを再選択できるようにリセット
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onImageAdd]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        aria-label="画像を選択"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="画像を添付"
        title="画像を添付"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>
    </>
  );
}
