import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  FileText, 
  Inbox, 
  Send, 
  Calendar, 
  Clock, 
  PlusCircle, 
  ArrowRight,
  AlertCircle
} from "lucide-react";

import { 
  useGetDashboardStats, 
  getGetDashboardStatsQueryKey,
  useGetRecentSurat,
  getGetRecentSuratQueryKey
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    error: errorStats 
  } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });

  const { 
    data: recentSurat, 
    isLoading: isLoadingRecent, 
    error: errorRecent 
  } = useGetRecentSurat({
    query: { queryKey: getGetRecentSuratQueryKey() }
  });

  if (errorStats || errorRecent) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>
            Terdapat kesalahan saat mengambil data dashboard. Silakan coba lagi.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Overview</h2>
          <p className="text-muted-foreground mt-1">Ringkasan aktivitas persuratan terkini.</p>
        </div>
        <Link href="/surat/baru">
          <Button className="shrink-0 gap-2">
            <PlusCircle className="h-4 w-4" />
            Buat Surat Baru
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard 
          title="Total Surat" 
          value={stats?.totalSurat} 
          icon={FileText} 
          loading={isLoadingStats} 
          colorClass="text-primary"
          bgClass="bg-primary/10"
        />
        <StatsCard 
          title="Surat Masuk" 
          value={stats?.suratMasuk} 
          icon={Inbox} 
          loading={isLoadingStats}
          colorClass="text-chart-3"
          bgClass="bg-chart-3/10"
        />
        <StatsCard 
          title="Surat Keluar" 
          value={stats?.suratKeluar} 
          icon={Send} 
          loading={isLoadingStats}
          colorClass="text-chart-2"
          bgClass="bg-chart-2/10"
        />
        <StatsCard 
          title="Bulan Ini" 
          value={stats?.suratBulanIni} 
          icon={Calendar} 
          loading={isLoadingStats}
          colorClass="text-chart-4"
          bgClass="bg-chart-4/10"
        />
        <StatsCard 
          title="Minggu Ini" 
          value={stats?.suratMingguIni} 
          icon={Clock} 
          loading={isLoadingStats}
          colorClass="text-chart-5"
          bgClass="bg-chart-5/10"
        />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Aktivitas Terkini</CardTitle>
              <CardDescription>Surat yang baru saja ditambahkan ke sistem.</CardDescription>
            </div>
            <Link href="/surat">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                Lihat Semua <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentSurat && recentSurat.length > 0 ? (
              <div className="space-y-6">
                {recentSurat.map((surat) => (
                  <div key={surat.id} className="flex items-start gap-4">
                    <div className={`mt-0.5 p-2.5 rounded-full shrink-0 ${surat.jenis === 'masuk' ? 'bg-chart-3/10 text-chart-3' : 'bg-chart-2/10 text-chart-2'}`}>
                      {surat.jenis === 'masuk' ? <Inbox className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/surat/${surat.id}`}>
                          <p className="text-sm font-medium leading-none hover:underline cursor-pointer truncate text-primary">
                            {surat.perihal}
                          </p>
                        </Link>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(surat.createdAt), "dd MMM yyyy", { locale: id })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {surat.nomorSurat}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] uppercase font-semibold ${surat.jenis === 'masuk' ? 'border-chart-3/50 text-chart-3' : 'border-chart-2/50 text-chart-2'}`}>
                          {surat.jenis}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {surat.jenis === 'masuk' ? `Dari: ${surat.pengirim}` : `Ke: ${surat.penerima}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">Belum ada surat</p>
                <p className="text-sm text-muted-foreground mt-1">Surat yang baru ditambahkan akan muncul di sini.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-border">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>Akses cepat ke menu utama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/surat/baru">
              <Button variant="outline" className="w-full justify-start h-12 gap-3" size="lg">
                <div className="bg-primary/10 text-primary p-1.5 rounded-md">
                  <PlusCircle className="h-4 w-4" />
                </div>
                Registrasi Surat Baru
              </Button>
            </Link>
            <Link href="/surat">
              <Button variant="outline" className="w-full justify-start h-12 gap-3" size="lg">
                <div className="bg-chart-3/10 text-chart-3 p-1.5 rounded-md">
                  <Inbox className="h-4 w-4" />
                </div>
                Semua Surat
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, loading, colorClass, bgClass }: { 
  title: string, 
  value?: number, 
  icon: any, 
  loading: boolean,
  colorClass: string,
  bgClass: string
}) {
  return (
    <Card className="shadow-sm border-border overflow-hidden">
      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
        <div className="flex justify-between items-start">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
        </div>
        <div>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-foreground">{value || 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
