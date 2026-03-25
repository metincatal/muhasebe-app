"use client";

import { useRef, useState, useCallback } from "react";

interface UseCameraOptions {
  maxWidth?: number;
  quality?: number;
}

export function useCamera(options: UseCameraOptions = {}) {
  const { maxWidth = 1600, quality = 0.8 } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Bu tarayici kamera erisimini desteklemiyor. HTTPS gereklidir.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Video metadatasi yuklenene kadar bekle
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          // Zaten yuklenmissel hemen play
          if (video.readyState >= 1) {
            video.play().then(resolve).catch(reject);
          }
        });
      }
      setIsActive(true);
    } catch (err) {
      console.error("Kamera hatasi:", err);
      let message = "Kamera erisimi reddedildi";
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          message = "Kamera izni reddedildi. Tarayici ayarlarindan kamera iznini acin.";
        } else if (err.name === "NotFoundError") {
          message = "Kamera bulunamadi. Cihazinizda kamera oldugundan emin olun.";
        } else if (err.name === "NotReadableError") {
          message = "Kamera baska bir uygulama tarafindan kullaniliyor.";
        } else if (err.name === "OverconstrainedError") {
          message = "Arka kamera bulunamadi, on kamera deneniyor...";
          // Arka kamera yoksa on kamerayi dene
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await new Promise<void>((resolve, reject) => {
                const video = videoRef.current!;
                video.onloadedmetadata = () => {
                  video.play().then(resolve).catch(reject);
                };
                if (video.readyState >= 1) {
                  video.play().then(resolve).catch(reject);
                }
              });
            }
            setIsActive(true);
            return;
          } catch {
            message = "Hicbir kamera erisimi saglanamadi.";
          }
        } else {
          message = err.message;
        }
      }
      setError(message);
      setIsActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Calculate dimensions maintaining aspect ratio
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  }, [maxWidth, quality]);

  return {
    videoRef,
    canvasRef,
    isActive,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}

export function dataURLtoFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binaryStr = atob(data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export function resizeImage(file: File, maxWidth: number = 1600, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;

      if (width <= maxWidth) {
        resolve(file);
        return;
      }

      height = (maxWidth / width) * height;
      width = maxWidth;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context alinamadi"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Blob olusturulamadi"));
            return;
          }
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Goruntu yuklenemedi"));
    };

    img.src = url;
  });
}
