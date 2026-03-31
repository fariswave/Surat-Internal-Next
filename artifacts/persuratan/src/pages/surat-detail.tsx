import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Inbox, 
  Send, 
  User, 
  Clock,
  Download,
  AlertCircle,
  FileIcon
} from "lucide-react";

import { useGetSuratById, getGetSuratByIdQueryKey } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function SuratDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = params.id ? parseInt(params.id, 10) : 0;

  const { data: surat, isLoading, error } = useGetSuratById(id, {
    query: {
      enabled: !!id,
      queryKey: getGetSuratByIdQueryKey(id),
    }
  });

  if (error) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/surat")} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal memuat detail surat</AlertTitle>
          <AlertDescription>
            Surat tidak ditemukan atau terjadi kesalahan server.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !surat) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMasuk = surat.jenis === 'masuk';

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/surat")} className="shrink-0 h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground line-clamp-1">{surat.nomorSurat}</h2>
              <Badge 
                variant="secondary" 
                className={isMasuk 
                  ? 'bg-chart-3/15 text-chart-3 border-chart-3/20' 
                  : 'bg-chart-2/15 text-chart-2 border-chart-2/20'
                }
              >
                {surat.jenis.toUpperCase()}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Didaftarkan pada {format(new Date(surat.createdAt), "dd MMMM yyyy HH:mm", { locale: localeId })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Informasi Surat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-8">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Perihal / Subjek</h3>
                <p className="text-lg font-semibold text-foreground">{surat.perihal}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground mb-1 gap-1.5">
                    {isMasuk ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    Instansi Pengirim
                  </div>
                  <p className="text-base text-foreground bg-muted/30 p-3 rounded-lg border border-border">
                    {surat.pengirim}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center text-sm font-medium text-muted-foreground mb-1 gap-1.5">
                    {isMasuk ? <Send className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
                    Instansi Penerima
                  </div>
                  <p className="text-base text-foreground bg-muted/30 p-3 rounded-lg border border-border">
                    {surat.penerima}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4" /> Keterangan Tambahan
                </h3>
                {surat.keterangan ? (
                  <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-lg border border-border">
                    {surat.keterangan}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Tidak ada keterangan tambahan.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-muted-foreground">Tanggal Surat</p>
                  <p className="text-foreground font-semibold">
                    {format(new Date(surat.tanggalSurat), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-muted-foreground">Didaftarkan Oleh</p>
                  <p className="text-foreground">{surat.createdByName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-muted-foreground">Waktu Registrasi</p>
                  <p className="text-foreground">
                    {format(new Date(surat.createdAt), "HH:mm, dd MMM yyyy", { locale: localeId })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dokumen Lampiran</CardTitle>
            </CardHeader>
            <CardContent>
              {surat.urlFile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <FileIcon className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={surat.namaFile || "Lampiran"}>
                        {surat.namaFile || "Lampiran Surat"}
                      </p>
                      <p className="text-xs text-muted-foreground">Tersedia</p>
                    </div>
                  </div>
                  <Button className="w-full gap-2" variant="default" asChild>
                    <a href={surat.urlFile} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4" /> Unduh Dokumen
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Tidak ada lampiran dokumen pada surat ini.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
