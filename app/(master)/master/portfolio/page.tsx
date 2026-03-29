"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MasterTabBar from "@/components/master/MasterTabBar";

interface Photo {
  id: number;
  imageUrl: string;
  description: string | null;
  createdAt: string;
}

export default function MasterPortfolioPage() {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;
    tg.ready();
    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setMasterId(d.master.id); });
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!masterId) return;
    const res = await fetch(`/api/master/portfolio?masterId=${masterId}`);
    const d = await res.json();
    setPhotos(d.photos || []);
    setLoading(false);
  }, [masterId]);

  useEffect(() => { if (masterId) fetchPhotos(); }, [masterId, fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !masterId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("masterId", String(masterId));
    try {
      await fetch("/api/master/portfolio/upload", { method: "POST", body: fd });
      await fetchPhotos();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (photo: Photo) => {
    if (!masterId) return;
    await fetch(`/api/master/portfolio?id=${photo.id}&masterId=${masterId}`, { method: "DELETE" });
    setSelectedPhoto(null);
    fetchPhotos();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-lg font-bold text-gray-900">Портфолио</h1>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      <div className="grid grid-cols-2 gap-2 px-5">
        <button
          onClick={() => fileRef.current?.click()}
          className="aspect-square bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center"
          disabled={uploading}
        >
          {uploading ? (
            <span className="text-gray-400 text-sm">Загрузка...</span>
          ) : (
            <>
              <span className="text-3xl text-gray-300">+</span>
              <span className="text-[10px] text-gray-400 mt-1">Добавить</span>
            </>
          )}
        </button>

        {loading ? (
          <div className="aspect-square bg-white rounded-xl animate-pulse" />
        ) : (
          photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPhoto(p)}
              className="aspect-square rounded-xl overflow-hidden"
            >
              <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))
        )}
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col">
          <div className="flex justify-between items-center p-4">
            <button onClick={() => setSelectedPhoto(null)} className="text-white text-sm">← Назад</button>
            <button
              onClick={() => { if (confirm("Удалить фото?")) handleDelete(selectedPhoto); }}
              className="text-red-400 text-sm"
            >
              Удалить
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={selectedPhoto.imageUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
          {selectedPhoto.description && (
            <div className="p-4 text-white text-sm text-center">{selectedPhoto.description}</div>
          )}
        </div>
      )}

      <MasterTabBar />
    </div>
  );
}
