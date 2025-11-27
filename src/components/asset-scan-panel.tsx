"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan, Video, VideoOff, QrCode, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ScanSource = "camera" | "manual";

export type ScanResult = { success: boolean; message?: string };

export interface AssetScanPanelProps {
  onDetected: (code: string, source: ScanSource) => Promise<ScanResult | void> | ScanResult | void;
  title?: string;
  description?: string;
  manualPlaceholder?: string;
  manualHelperText?: string;
  className?: string;
}

const generateRegionId = () => `scan-region-${Math.random().toString(36).slice(2, 9)}`;

export function AssetScanPanel({
  onDetected,
  title = "Scanner",
  description = "Gunakan kamera atau input manual untuk memilih aset.",
  manualPlaceholder = "Masukkan nomor aset (contoh: FA001/I/01)",
  manualHelperText = "Gunakan input manual jika barcode sulit terbaca kamera.",
  className,
}: AssetScanPanelProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualFeedback, setManualFeedback] = useState<string | null>(null);

  const scannerRef = useRef<any>(null);
  const lastDetectedRef = useRef("");
  const detectionLockRef = useRef(false);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const scanRegionId = useMemo(generateRegionId, []);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.stop();
    } catch (error) {
      console.warn("Failed to stop scanner", error);
    }
    try {
      scannerRef.current.clear();
    } catch (error) {
      console.warn("Failed to clear scanner", error);
    }
    scannerRef.current = null;
    setScannerReady(false);
  }, []);

  const handleDetection = useCallback(
    async (value: string, source: ScanSource): Promise<boolean> => {
      const trimmed = value.trim();
      if (!trimmed || detectionLockRef.current) return false;
      detectionLockRef.current = true;
      if (source === "camera") {
        setScannerMessage(`Memproses ${trimmed}...`);
      }
      try {
        const result = await onDetected(trimmed, source);
        const success = result === undefined || (result as ScanResult)?.success !== false;
        const message =
          (result as ScanResult)?.message || "Gagal memproses hasil scan. Coba ulangi.";
        if (!success) {
          if (source === "manual") {
            setManualFeedback(message);
          } else {
            setScannerError(message);
            setTimeout(() => setScannerError(null), 3000);
          }
          return false;
        }
        if (source === "manual") {
          setManualFeedback(null);
        }
        return true;
      } catch (error) {
        const fallbackMessage = "Gagal memproses hasil scan. Coba ulangi.";
        const message =
          error instanceof Error && error.message
            ? error.message
            : fallbackMessage;
        if (source === "manual") {
          setManualFeedback(message);
        } else {
          setScannerError(message);
          setTimeout(() => setScannerError(null), 3000);
        }
        return false;
      } finally {
        detectionLockRef.current = false;
        if (source === "camera") {
          setScannerMessage(null);
        }
      }
    },
    [onDetected]
  );

  const initScanner = useCallback(async () => {
    try {
      const html5QrcodeModule = await import("html5-qrcode");
      const cameras = await html5QrcodeModule.Html5Qrcode.getCameras();

      if (!cameras.length) {
        setScannerError("Kamera tidak ditemukan. Gunakan input manual.");
        setScannerMessage(null);
        return;
      }

      const preferred =
        cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ||
        cameras[1] ||
        cameras[0];

      const html5Qrcode = new html5QrcodeModule.Html5Qrcode(scanRegionId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { deviceId: { exact: preferred.id } },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        (decodedText: string) => {
          if (!decodedText) return;
          if (lastDetectedRef.current === decodedText) return;
          lastDetectedRef.current = decodedText;
          handleDetection(decodedText, "camera");
          setTimeout(() => {
            if (lastDetectedRef.current === decodedText) {
              lastDetectedRef.current = "";
            }
          }, 2000);
        },
        () => null
      );

      setScannerReady(true);
      setScannerMessage(null);
      setScannerError(null);
    } catch (error) {
      console.error("Scanner initialization error:", error);
      setScannerError("Tidak dapat mengaktifkan kamera. Gunakan input manual.");
      setScannerMessage(null);
    }
  }, [handleDetection, scanRegionId]);

  useEffect(() => {
    if (cameraActive) {
      initScanner();
      setScannerMessage("Menghubungkan kamera...");
    } else {
      stopScanner();
      setScannerMessage("Kamera dimatikan");
    }

    return () => {
      lastDetectedRef.current = "";
      stopScanner();
    };
  }, [cameraActive, initScanner, stopScanner]);

  useEffect(() => {
    const focusManualInput = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "x") return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditable =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";
      if (isEditable) return;
      event.preventDefault();
      manualInputRef.current?.focus();
      manualInputRef.current?.select();
    };

    window.addEventListener("keydown", focusManualInput);
    return () => window.removeEventListener("keydown", focusManualInput);
  }, []);

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = manualValue.trim();
    if (!trimmed) {
      setManualFeedback("Nomor aset tidak boleh kosong");
      return;
    }
    setManualLoading(true);
    setManualFeedback(null);
    try {
      const success = await handleDetection(trimmed, "manual");
      if (success) {
        setManualValue("");
        setManualFeedback(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memproses input manual";
      setManualFeedback(message);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <Card className={cn("surface-card border border-surface-border/70 shadow-none", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Scan className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        <div className="rounded-2xl border border-dashed border-primary/30 bg-secondary/30 p-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black/80">
            <div
              id={scanRegionId}
              className="h-full w-full overflow-hidden rounded-xl border border-gray-900/40"
            />
            <div className="pointer-events-none absolute inset-5 rounded-[32px] border-2 border-primary/80 shadow-[0_0_30px_rgba(88,88,214,0.35)]">
              <div className="absolute inset-0">
                <div className="absolute left-4 top-4 h-6 w-6 border-l-2 border-t-2 border-white/80" />
                <div className="absolute right-4 top-4 h-6 w-6 border-r-2 border-t-2 border-white/80" />
                <div className="absolute left-4 bottom-4 h-6 w-6 border-l-2 border-b-2 border-white/80" />
                <div className="absolute right-4 bottom-4 h-6 w-6 border-r-2 border-b-2 border-white/80" />
              </div>
            </div>
            {!scannerReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-gray-900/90 text-center text-xs text-white/70">
                {scannerMessage || scannerError || "Menghubungkan kamera..."}
              </div>
            )}
          </div>
          <div className="mt-3 rounded-xl bg-white/60 p-3 text-xs text-text-muted">
            {scannerError ? <p className="text-red-500">{scannerError}</p> : <p>Pastikan barcode berada di dalam kotak.</p>}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCameraActive((prev) => !prev)}
              className="w-full justify-center text-xs"
            >
              {cameraActive ? (
                <>
                  <VideoOff className="mr-2 h-3.5 w-3.5" />
                  Matikan kamera
                </>
              ) : (
                <>
                  <Video className="mr-2 h-3.5 w-3.5" />
                  Nyalakan kamera
                </>
              )}
            </Button>
          </div>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-text-muted">
            Input manual
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              ref={manualInputRef}
              value={manualValue}
              onChange={(e) => {
                setManualValue(e.target.value);
                if (manualFeedback) {
                  setManualFeedback(null);
                }
              }}
              placeholder={manualPlaceholder}
              className="h-11 text-sm"
            />
            <Button type="submit" className="h-11 sm:w-auto" disabled={manualLoading}>
              {manualLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Verifikasi
                </>
              )}
            </Button>
          </div>
          {manualHelperText && (
            <p className="text-xs text-text-muted">{manualHelperText}</p>
          )}
          {manualFeedback && (
            <p className="text-xs font-medium text-red-500">{manualFeedback}</p>
          )}
        </form>
        <style jsx global>{`
          #${scanRegionId} video,
          #${scanRegionId} canvas {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover;
            border-radius: 1rem;
          }
        `}</style>
    </CardContent>
  </Card>
);
}
