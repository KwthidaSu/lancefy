import { useRef, useState } from "react";
import { ImagePlus, X, Star } from "lucide-react";
import { cn } from "@/utils/cn";

export type ImageItem = {
  id: string;
  url: string; // object URL for preview
  file: File;
};

type ImageUploaderProps = {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxFiles?: number;
  className?: string;
};

let _idCounter = 0;
function nextId() {
  return String(++_idCounter);
}

export default function ImageUploader({
  images,
  onChange,
  maxFiles = 5,
  className,
}: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxFiles - images.length;
    const toAdd: ImageItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining)
      .map((f) => ({ id: nextId(), url: URL.createObjectURL(f), file: f }));
    if (toAdd.length > 0) onChange([...images, ...toAdd]);
  };

  const remove = (id: string) => {
    const item = images.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.url);
    onChange(images.filter((i) => i.id !== id));
  };

  const setCover = (id: string) => {
    const idx = images.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const reordered = [images[idx], ...images.slice(0, idx), ...images.slice(idx + 1)];
    onChange(reordered);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {images.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
            dragging
              ? "border-accent bg-accent/5 scale-[0.99]"
              : "border-border hover:border-accent hover:bg-accent/5"
          )}
        >
          <ImagePlus className="w-8 h-8 mx-auto mb-2 text-text-muted" />
          <p className="text-sm text-foreground font-medium">
            ลากไฟล์มาวางที่นี่ หรือ{" "}
            <span className="text-primary">คลิกเพื่อเลือก</span>
          </p>
          <p className="text-xs text-text-muted mt-1">
            PNG, JPG, GIF, WEBP · สูงสุด 10 MB ต่อไฟล์ · ได้สูงสุด {maxFiles} ภาพ
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Cover preview large */}
          <div className="relative rounded-xl overflow-hidden bg-gray-100 h-48 w-full">
            <img
              src={images[0].url}
              alt="cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-accent text-white text-xs font-bold px-2 py-1 rounded-full shadow">
              <Star className="w-3 h-3 fill-white" /> Cover
            </div>
            <button
              type="button"
              onClick={() => remove(images[0].id)}
              className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
              <span className="text-[10px] text-white/80 truncate block">{images[0].file.name}</span>
            </div>
          </div>

          {/* Thumbnail strip */}
          {(images.length > 1 || images.length < maxFiles) && (
            <div className="flex gap-2 flex-wrap">
              {images.slice(1).map((img) => (
                <div
                  key={img.id}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-gray-50 flex-shrink-0"
                >
                  <img src={img.url} alt={img.file.name} className="w-full h-full object-cover" />

                  <button
                    type="button"
                    onClick={() => setCover(img.id)}
                    title="ตั้งเป็น Cover"
                    className="absolute bottom-0 left-0 right-0 bg-black/55 hover:bg-accent transition-colors flex items-center justify-center gap-0.5 py-1"
                  >
                    <Star className="w-3 h-3 text-white" />
                    <span className="text-[9px] text-white font-bold">Cover</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => remove(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}

              {images.length < maxFiles && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 flex flex-col items-center justify-center gap-1 transition-colors flex-shrink-0"
                >
                  <ImagePlus className="w-5 h-5 text-text-muted" />
                  <span className="text-[10px] text-text-muted">เพิ่มรูป</span>
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-text-muted">
            {images.length} / {maxFiles} ภาพ · กดปุ่ม <strong>Cover</strong> ใต้รูปเพื่อตั้งเป็นรูปหน้าปก
          </p>
        </div>
      )}
    </div>
  );
}
