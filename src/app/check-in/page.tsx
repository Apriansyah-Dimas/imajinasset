"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";

interface AssetRecord {
  id: string;
  name: string;
  noAsset: string;
  status: string;
  serialNo?: string | null;
  brand?: string | null;
  model?: string | null;
}

interface PicOption {
  id: string;
  name: string;
}

interface CheckoutEntry {
  id: string;
  checkoutDate: string;
  dueDate?: string | null;
  assignTo: { id: string; name: string };
  notes?: string | null;
  asset?: { id: string; name: string; noAsset: string };
  status?: string;
}

interface CheckInFormState {
  returnDate: string;
  receivedBy: string;
  notes: string;
}

const formatDateTimeForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDisplayDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

function AssetInfo({
  label,
  value,
}: {
  label: string;
  value: string | ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value || "-"}</p>
    </div>
  );
}

function OutstandingCard({
  entry,
  onSelect,
}: {
  entry: CheckoutEntry;
  onSelect: (entry: CheckoutEntry) => void;
}) {
  return (
    <div className="rounded-xl border bg-background p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {entry.asset?.noAsset ?? "-"}
          </p>
          <p className="text-base font-semibold text-foreground">
            {entry.asset?.name ?? "Asset"}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onSelect(entry)}>
          Gunakan
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Dipinjam oleh{" "}
        <span className="font-semibold text-foreground">
          {entry.assignTo.name}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Sejak {formatDisplayDateTime(entry.checkoutDate)} • Due{" "}
        {entry.dueDate ? formatDisplayDateTime(entry.dueDate) : "-"}
      </p>
    </div>
  );
}

function CheckInContent() {
  const [assetNumber, setAssetNumber] = useState("");
  const [assetError, setAssetError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<CheckoutEntry | null>(
    null,
  );
  const [pics, setPics] = useState<PicOption[]>([]);
  const [picsLoading, setPicsLoading] = useState(false);
  const [formData, setFormData] = useState<CheckInFormState>({
    returnDate: formatDateTimeForInput(new Date()),
    receivedBy: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [pendingCheckouts, setPendingCheckouts] = useState<CheckoutEntry[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const fetchPics = useCallback(async () => {
    setPicsLoading(true);
    try {
      const response = await fetch("/api/pics");
      if (!response.ok) {
        toast.error("Gagal memuat PIC.");
        return;
      }
      const data = (await response.json()) as PicOption[];
      setPics(data);
    } catch (error) {
      console.error("PIC fetch error:", error);
      toast.error("Tidak dapat memuat PIC.");
    } finally {
      setPicsLoading(false);
    }
  }, []);

  const loadPendingCheckouts = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const response = await fetch("/api/check-outs?status=OUT&limit=50");
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setPendingError(data?.error ?? "Gagal memuat daftar pending.");
        setPendingCheckouts([]);
        return;
      }
      const payload = (await response.json()) as {
        history?: CheckoutEntry[];
      };
      setPendingCheckouts(payload.history ?? []);
    } catch (error) {
      console.error("Pending checkouts fetch error:", error);
      setPendingError("Tidak dapat memuat daftar pending.");
      setPendingCheckouts([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPics();
    loadPendingCheckouts();
  }, [fetchPics, loadPendingCheckouts]);

  const resetFlow = () => {
    setSelectedAsset(null);
    setActiveCheckout(null);
    setAssetNumber("");
    setFormData({
      returnDate: formatDateTimeForInput(new Date()),
      receivedBy: "",
      notes: "",
    });
  };

  const fetchActiveCheckout = useCallback(async (assetId: string) => {
    try {
      const response = await fetch(
        `/api/check-outs?assetId=${assetId}&limit=1`,
      );
      if (!response.ok) {
        setActiveCheckout(null);
        return;
      }
      const payload = (await response.json()) as {
        history?: CheckoutEntry[];
      };
      const latest =
        payload.history?.find(
          (item) => (item as any).status === "OUT",
        ) ?? null;
      if (latest) {
        setActiveCheckout(latest);
        setFormData((prev) => ({
          ...prev,
          returnDate: formatDateTimeForInput(new Date()),
        }));
      } else {
        setActiveCheckout(null);
      }
    } catch (error) {
      console.error("Active checkout fetch error:", error);
      setActiveCheckout(null);
    }
  }, []);

  const verifyAsset = useCallback(
    async (number: string) => {
      const trimmed = number.trim();
      if (!trimmed) {
        setAssetError("Masukkan nomor asset terlebih dahulu.");
        return;
      }
      setAssetError(null);
      setLookupLoading(true);
      try {
        const query = encodeURIComponent(trimmed);
        const response = await fetch(`/api/assets/by-number?number=${query}`);
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          const message = data?.error ?? "Asset tidak ditemukan.";
          setAssetError(message);
          toast.error(message);
          setSelectedAsset(null);
          setActiveCheckout(null);
          return;
        }

        const asset = (await response.json()) as AssetRecord;
        setSelectedAsset(asset);
        setAssetNumber(asset.noAsset);
        await fetchActiveCheckout(asset.id);
      } catch (error) {
        console.error("Asset lookup error:", error);
        setAssetError("Terjadi kesalahan saat mencari asset.");
        toast.error("Terjadi kesalahan saat mencari asset.");
        setSelectedAsset(null);
        setActiveCheckout(null);
      } finally {
        setLookupLoading(false);
      }
    },
    [fetchActiveCheckout],
  );

  const handleVerifyAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await verifyAsset(assetNumber);
  };

  const handleSubmit = async () => {
    if (!activeCheckout) return;
    if (!formData.receivedBy) {
      toast.error("PIC penerima wajib dipilih.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/check-outs/${activeCheckout.id}/return`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnedAt: formData.returnDate,
            receivedById: formData.receivedBy,
            returnNotes: formData.notes,
          }),
        },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Gagal memproses check in");
      }
      toast.success("Asset berhasil di-check in.");
      await loadPendingCheckouts();
      resetFlow();
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal memproses check in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pendingInfo = useMemo(() => {
    if (!activeCheckout) return null;
    return (
      <>
        <AssetInfo
          label="Dipinjam oleh"
          value={activeCheckout.assignTo.name}
        />
        <AssetInfo
          label="Check Out Date"
          value={formatDisplayDateTime(activeCheckout.checkoutDate)}
        />
        <AssetInfo
          label="Due Date"
          value={
            activeCheckout.dueDate
              ? formatDisplayDateTime(activeCheckout.dueDate)
              : "-"
          }
        />
      </>
    );
  }, [activeCheckout]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">Check In</h1>
          <p className="text-sm text-muted-foreground">
            Masukkan Asset No untuk memproses pengembalian asset.
          </p>
        </div>

        <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Asset Verification
            </h2>
            <p className="text-sm text-muted-foreground">
              Input nomor asset terlebih dahulu lalu klik Verify untuk menampilkan
              checkout aktif.
            </p>
          </div>

          <form onSubmit={handleVerifyAsset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetNumber">Asset No / No Asset</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="assetNumber"
                  placeholder="Contoh: FA001-IT-0001"
                  value={assetNumber}
                  onChange={(event) => setAssetNumber(event.target.value)}
                  required
                  className="flex-1"
                />
                <Button
                  type="submit"
                  className="w-full sm:w-40"
                  disabled={lookupLoading}
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mencari
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>

            {assetError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {assetError}
              </p>
            )}
          </form>

          {selectedAsset && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-background p-4 shadow-sm">
                <p className="text-xs uppercase text-muted-foreground">
                  Asset Ditemukan
                </p>
                <p className="text-base font-semibold text-foreground">
                  {selectedAsset.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAsset.noAsset}
                </p>
              </div>

              {activeCheckout ? (
                <div className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-foreground">
                    Checkout Aktif
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">{pendingInfo}</div>
                  {activeCheckout.notes && (
                    <p className="text-xs text-muted-foreground">
                      Notes: {activeCheckout.notes}
                    </p>
                  )}

                  <div className="space-y-4 border-t border-border/40 pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Check In Date</Label>
                        <Input
                          type="datetime-local"
                          value={formData.returnDate}
                          onChange={(event) =>
                            setFormData((prev) => ({
                              ...prev,
                              returnDate: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Diterima Oleh</Label>
                        <Select
                          value={formData.receivedBy}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              receivedBy: value,
                            }))
                          }
                          disabled={picsLoading || pics.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih PIC penerima" />
                          </SelectTrigger>
                          <SelectContent>
                            {pics.map((pic) => (
                              <SelectItem key={pic.id} value={pic.id}>
                                {pic.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {pics.length === 0 && !picsLoading && (
                          <p className="text-xs text-muted-foreground">
                            Belum ada data PIC aktif.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Return Notes</Label>
                      <Textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="Catatan kondisi asset saat kembali."
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetFlow}
                        disabled={submitting}
                      >
                        Batalkan
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !formData.receivedBy}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Memproses
                          </>
                        ) : (
                          "Check In"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                  Asset ini tidak memiliki checkout aktif. Pastikan nomor asset
                  sudah sesuai.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Pending Check Out
              </h2>
              <p className="text-sm text-muted-foreground">
                Daftar asset yang belum dikembalikan (urut terbaru).
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadPendingCheckouts}
              disabled={pendingLoading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {pendingError && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {pendingError}
            </p>
          )}

          {!pendingError && pendingCheckouts.length === 0 && !pendingLoading && (
            <p className="mt-4 text-sm text-muted-foreground">
              Tidak ada asset pending.
            </p>
          )}

          {pendingLoading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat daftar pending...
            </div>
          )}

          {!pendingError && pendingCheckouts.length > 0 && (
            <div className="mt-4 space-y-3">
              {pendingCheckouts.map((entry) => (
                <OutstandingCard
                  key={entry.id}
                  entry={entry}
                  onSelect={(item) => {
                    if (item.asset?.noAsset) {
                      setAssetNumber(item.asset.noAsset);
                      verifyAsset(item.asset.noAsset);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER", "VIEWER"]}>
      <CheckInContent />
    </ProtectedRoute>
  );
}
