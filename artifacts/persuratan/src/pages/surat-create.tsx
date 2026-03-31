import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
  ArrowLeft, 
  CalendarIcon, 
  UploadCloud, 
  File, 
  X,
  Save
} from "lucide-react";

import { useCreateSurat } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSuratListQueryKey } from "@workspace/api-client-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const formSchema = z.object({
  nomorSurat: z.string().min(1, "Nomor surat wajib diisi"),
  perihal: z.string().min(1, "Perihal wajib diisi"),
  jenis: z.enum(["masuk", "keluar"], { required_error: "Pilih jenis surat" }),
  pengirim: z.string().min(1, "Pengirim wajib diisi"),
  penerima: z.string().min(1, "Penerima wajib diisi"),
  tanggalSurat: z.date({ required_error: "Tanggal surat wajib diisi" }),
  keterangan: z.string().optional(),
});

export default function SuratCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateSurat();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomorSurat: "",
      perihal: "",
      jenis: undefined,
      pengirim: "",
      penerima: "",
      keterangan: "",
    },
  });

  const watchJenis = form.watch("jenis");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Need to cast to any to handle Blob -> File type mismatch in the generated types safely
      const payload: any = {
        ...values,
        tanggalSurat: values.tanggalSurat.toISOString(),
      };

      if (file) {
        payload.file = file;
      }

      await createMutation.mutateAsync({ data: payload });
      
      toast({
        title: "Surat berhasil disimpan",
        description: "Data surat telah ditambahkan ke sistem.",
      });
      
      queryClient.invalidateQueries({ queryKey: getGetSuratListQueryKey() });
      setLocation("/surat");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan surat",
        description: error.message || "Terjadi kesalahan saat menyimpan data.",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File terlalu besar",
          description: "Maksimal ukuran file adalah 5MB.",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/surat")} className="shrink-0 h-10 w-10 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Registrasi Surat Baru</h2>
          <p className="text-muted-foreground text-sm">Isi formulir di bawah ini untuk mendata surat baru.</p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="jenis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Surat</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Pilih jenis surat" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masuk">Surat Masuk</SelectItem>
                          <SelectItem value="keluar">Surat Keluar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tanggalSurat"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel className="mb-2">Tanggal Surat</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal h-11",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: localeId })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nomorSurat"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Nomor Surat</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: 001/HRD/VIII/2023" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="perihal"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Perihal / Subjek</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Undangan Rapat Koordinasi" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pengirim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchJenis === 'keluar' ? 'Pengirim (Internal)' : 'Instansi Pengirim'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama instansi atau bagian" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="penerima"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchJenis === 'masuk' ? 'Penerima (Internal)' : 'Instansi Tujuan'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama instansi atau bagian tujuan" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keterangan"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Keterangan Tambahan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Catatan atau keterangan lain..." 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Dokumen Lampiran (Opsional)</FormLabel>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors hover:bg-muted/50 cursor-pointer",
                    file ? "border-primary bg-primary/5" : "border-border"
                  )}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,image/jpeg,image/png,image/jpg"
                    onChange={handleFileChange}
                  />
                  
                  {file ? (
                    <div className="flex items-center justify-between bg-background p-4 rounded-lg border border-border shadow-sm max-w-md mx-auto">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-primary/10 p-2 rounded-md shrink-0">
                          <File className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className="bg-muted p-4 rounded-full mb-4">
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Klik untuk upload file dokumen</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Maks. 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-border flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/surat")}
                  disabled={createMutation.isPending}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="gap-2 px-8">
                  {createMutation.isPending ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Data Surat
                    </>
                  )}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
