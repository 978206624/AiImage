"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  dir?: string;
}

export default function ImageUploader({
  value,
  onChange,
  dir = "gallery",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert("图片大小不能超过 20MB");
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, dir }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const { host, key, policy, signature, OSSAccessKeyId, successActionStatus } =
          json.data;

        const formData = new FormData();
        formData.append("key", key);
        formData.append("policy", policy);
        formData.append("Signature", signature);
        formData.append("OSSAccessKeyId", OSSAccessKeyId);
        formData.append("success_action_status", successActionStatus);
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", host, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 204) {
              const imageUrl = `${host}/${key}`;
              onChange(imageUrl);
              resolve();
            } else {
              reject(new Error(`上传失败: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("网络错误"));
          xhr.send(formData);
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : "上传失败");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [dir, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) upload(file);
    },
    [upload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      e.target.value = "";
    },
    [upload]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg transition-colors ${
        dragOver
          ? "border-accent bg-accent-d"
          : "border-border hover:border-muted"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="已上传"
            className="w-full h-48 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white/20 text-white text-sm rounded hover:bg-white/30"
            >
              更换
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 bg-red-500/80 text-white text-sm rounded hover:bg-red-500"
            >
              删除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-48 flex flex-col items-center justify-center gap-2 text-muted cursor-pointer"
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{progress}%</span>
            </>
          ) : (
            <>
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                />
              </svg>
              <span className="text-sm">点击或拖拽上传图片</span>
              <span className="text-xs text-muted/60">支持 JPG/PNG/WebP，最大 20MB</span>
            </>
          )}
        </button>
      )}

      {uploading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface2 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
