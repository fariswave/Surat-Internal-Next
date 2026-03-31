import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Trash2, 
  AlertCircle,
  MoreHorizontal
} from "lucide-react";

import { 
  useGetSuratList, 
  getGetSuratListQueryKey,
  useDeleteSurat
} from "@workspace/api-client-react";
import type { GetSuratListJenis } from "@workspace/api-client-react/src/generated/api.schemas";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

export default function SuratList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"semua" | "masuk" | "keluar">("semua");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Parse jenis for API
  const jenisParam: GetSuratListJenis | undefined = 
    activeTab === "semua" ? undefined : activeTab as GetSuratListJenis;

  const { data, isLoading, error, refetch } = useGetSuratList(
    { jenis: jenisParam, page, limit },
    { query: { queryKey: getGetSuratListQueryKey({ jenis: jenisParam, page, limit }) } }
  );

  const deleteSuratMutation = useDeleteSurat();

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await deleteSuratMutation.mutateAsync({ id: deleteId });
      toast({
        title: "Surat dihapus",
        description: "Surat berhasil dihapus dari sistem.",
      });
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: getGetSuratListQueryKey() });
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: error.message || "Terjadi kesalahan saat menghapus surat.",
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Simple client-side search filtering (since API doesn't have search param based on specs)
  const filteredData = data?.data?.filter(surat => 
    surat.perihal.toLowerCase().includes(search.toLowerCase()) || 
    surat.nomorSurat.toLowerCase().includes(search.toLowerCase()) ||
    surat.pengirim.toLowerCase().includes(search.toLowerCase()) ||
    surat.penerima.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>
            Terdapat kesalahan saat mengambil daftar surat. Silakan coba lagi.
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Daftar Surat</h2>
          <p className="text-muted-foreground mt-1">Kelola semua surat masuk dan keluar.</p>
        </div>
        <Link href="/surat/baru">
          <Button className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Surat Baru
          </Button>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <Tabs 
            defaultValue="semua" 
            value={activeTab} 
            onValueChange={(val) => {
              setActiveTab(val as any);
              setPage(1); // Reset page on tab change
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="semua">Semua</TabsTrigger>
              <TabsTrigger value="masuk">Masuk</TabsTrigger>
              <TabsTrigger value="keluar">Keluar</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari surat..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[180px]">Nomor Surat</TableHead>
                <TableHead>Perihal</TableHead>
                <TableHead>Pengirim / Penerima</TableHead>
                <TableHead className="w-[120px]">Tanggal</TableHead>
                <TableHead className="w-[100px]">Jenis</TableHead>
                <TableHead className="w-[70px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredData && filteredData.length > 0 ? (
                filteredData.map((surat) => (
                  <TableRow key={surat.id} className="group cursor-default hover:bg-muted/20">
                    <TableCell className="font-medium text-foreground">
                      {surat.nomorSurat}
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-2" title={surat.perihal}>
                        {surat.perihal}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {surat.jenis === 'masuk' ? (
                          <>
                            <span className="text-xs text-muted-foreground">Dari:</span>
                            <span className="font-medium truncate max-w-[200px]" title={surat.pengirim}>{surat.pengirim}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">Ke:</span>
                            <span className="font-medium truncate max-w-[200px]" title={surat.penerima}>{surat.penerima}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(surat.tanggalSurat), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={surat.jenis === 'masuk' 
                          ? 'bg-chart-3/15 text-chart-3 hover:bg-chart-3/20 border-chart-3/20' 
                          : 'bg-chart-2/15 text-chart-2 hover:bg-chart-2/20 border-chart-2/20'
                        }
                      >
                        {surat.jenis.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="sr-only">Buka menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <Link href={`/surat/${surat.id}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Lihat Detail</span>
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem 
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => setDeleteId(surat.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Hapus</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-10 w-10 mb-3 opacity-20" />
                      <p>Tidak ada surat ditemukan</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Basic Pagination info */}
        {data && data.total > 0 && !search && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
            <div>
              Menampilkan {Math.min((page - 1) * limit + 1, data.total)} - {Math.min(page * limit, data.total)} dari {data.total} surat
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page * limit >= data.total}
                onClick={() => setPage(p => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Surat</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus surat ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSuratMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteSuratMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSuratMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
