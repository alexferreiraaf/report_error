'use client';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, Download, FileText, Image, Video, CheckCircle, Trash2, Check, DownloadCloud, Circle, RefreshCw, Edit, Save, X, Loader2, Database } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { reportSchema } from '@/lib/definitions';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
  
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import jsPDF from 'jspdf';


interface ErrorReport {
  id: string;
  clientName: string;
  technicianName: string;
  errorDate: string;
  reportText: string;
  mediaUrl?: string | null;
  databaseSavedOnPC: 'sim' | 'não';
  generatedAt: Timestamp | null;
  status: 'open' | 'concluded';
}

type ReportFormValues = z.infer<typeof reportSchema>;

function ReportItem({ report }: { report: ErrorReport }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const form = useForm<ReportFormValues>({
        resolver: zodResolver(reportSchema),
        defaultValues: {
            clientName: report.clientName,
            technicianName: report.technicianName,
            errorDate: report.errorDate,
            reportText: report.reportText,
            reportedByUserId: '',
            status: report.status,
            mediaFile: undefined,
            databaseSavedOnPC: report.databaseSavedOnPC,
        },
    });

    const isImage = report.mediaUrl && report.mediaUrl.startsWith('data:image');
    const isVideo = report.mediaUrl && report.mediaUrl.startsWith('data:video');

    const handleStatusChange = async () => {
        if (!firestore) return;
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        if (!appId) return;

        const reportRef = doc(firestore, `artifacts/${appId}/public/data/error_reports`, report.id);
        const newStatus = report.status === 'open' ? 'concluded' : 'open';
        
        updateDoc(reportRef, { status: newStatus })
            .then(() => {
                toast({
                    title: 'Status Atualizado!',
                    description: `O relatório foi marcado como ${newStatus === 'concluded' ? 'concluído' : 'aberto'}.`,
                });
            })
            .catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: reportRef.path,
                    operation: 'update',
                    requestResourceData: { status: newStatus },
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };
    
    const handleDelete = async () => {
        if (!firestore) return;
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        if (!appId) return;
        const reportRef = doc(firestore, `artifacts/${appId}/public/data/error_reports`, report.id);
        
        deleteDoc(reportRef)
            .then(() => {
                toast({
                    title: 'Relatório Excluído',
                    description: 'O relatório foi removido com sucesso.',
                });
            })
            .catch((error) => {
                const permissionError = new FirestorePermissionError({
                    path: reportRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const handleDownload = () => {
        const doc = new jsPDF();
        const margin = 15;
        let y = 20;

        doc.setFontSize(18);
        doc.text('Relatório de Erro', margin, y);
        y += 10;

        doc.setLineWidth(0.5);
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.text(`Cliente: ${report.clientName}`, margin, y);
        y += 7;
        doc.text(`Técnico: ${report.technicianName}`, margin, y);
        y += 7;
        doc.text(`Data do Erro: ${report.errorDate ? format(new Date(report.errorDate), 'dd/MM/yyyy') : 'N/A'}`, margin, y);
        y += 7;
        doc.text(`Data de Geração: ${report.generatedAt ? format(report.generatedAt.toDate(), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}`, margin, y);
        y += 7;
        doc.text(`Status: ${report.status === 'open' ? 'Aberto' : 'Concluído'}`, margin, y);
        y += 7;
        doc.text(`Banco de dados salvo no PC: ${report.databaseSavedOnPC}`, margin, y);
        y += 10;

        doc.setFont('helvetica', 'bold');
        doc.text('Descrição do Problema:', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(report.reportText, doc.internal.pageSize.width - margin * 2);
        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Anexo:', margin, y);
        y += 7;

        if (isImage && report.mediaUrl) {
            try {
                const img = new (window as any).Image();
                img.src = report.mediaUrl;
                
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                
                const maxWidth = pageWidth - (margin * 2);
                const maxHeight = pageHeight - y - margin;

                let imgWidth = img.width;
                let imgHeight = img.height;
                let ratio = imgWidth / imgHeight;

                if (imgWidth > maxWidth) {
                    imgWidth = maxWidth;
                    imgHeight = imgWidth / ratio;
                }
                
                if (imgHeight > maxHeight) {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * ratio;
                }
                
                if (y + imgHeight > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                }

                doc.addImage(report.mediaUrl, 'PNG', margin, y, imgWidth, imgHeight);
            } catch (e) {
                console.error("Erro ao adicionar imagem ao PDF:", e);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(255, 0, 0);
                doc.text('Não foi possível carregar a imagem no PDF.', margin, y);
            }
        } else if (isVideo && report.mediaUrl) {
            doc.setFont('helvetica', 'normal');
            doc.textWithLink('Clique para ver o vídeo (link externo)', margin, y, { url: report.mediaUrl });
             y += 7;
             doc.setFontSize(8);
             doc.setTextColor(150);
             doc.text('O vídeo não pode ser embutido diretamente no PDF.', margin, y);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.text('Nenhum anexo de mídia fornecido.', margin, y);
        }


        doc.save(`relatorio_${report.clientName}_${report.id}.pdf`);
    };

    const getFileName = (fileType: 'media') => {
        if (!report.generatedAt) return 'download';
        const date = format(report.generatedAt.toDate(), 'yyyy-MM-dd_HH-mm');
        
        if (fileType === 'media') {
            if (isImage) return `media_${report.clientName}_${date}.png`;
            if (isVideo) return `media_${report.clientName}_${date}.mp4`;
        }
        return 'download';
    }

    const onUpdate: SubmitHandler<ReportFormValues> = async (data) => {
        if (!firestore) return;
        setIsUpdating(true);
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        if (!appId) return;

        const reportRef = doc(firestore, `artifacts/${appId}/public/data/error_reports`, report.id);

        const updatedData = {
            clientName: data.clientName,
            technicianName: data.technicianName,
            errorDate: data.errorDate,
            reportText: data.reportText,
            databaseSavedOnPC: data.databaseSavedOnPC,
        };

        updateDoc(reportRef, updatedData)
            .then(() => {
                toast({
                    title: 'Relatório Atualizado',
                    description: 'As alterações foram salvas com sucesso.',
                });
                setIsEditing(false);
            })
            .catch((error) => {
                 const permissionError = new FirestorePermissionError({
                    path: reportRef.path,
                    operation: 'update',
                    requestResourceData: updatedData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsUpdating(false);
            });
    };

    const EditView = () => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)}>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-primary">Editando: {report.clientName}</DialogTitle>
                    <DialogDescription>
                        Ajuste as informações do relatório abaixo.
                    </DialogDescription>
                </DialogHeader>
                <Separator className="my-4" />
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    <FormField
                        control={form.control}
                        name="clientName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Cliente</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="technicianName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Técnico</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="errorDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Data do Erro</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="databaseSavedOnPC"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Banco de dados salvo no PC?</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex space-x-4"
                                >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="sim" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Sim
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="não" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Não
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reportText"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Relatório Detalhado</FormLabel>
                                <FormControl><Textarea rows={6} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Separator className="mt-4" />
                <DialogFooter className="pt-4 gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
                    <Button type="submit" disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );

    const DetailView = () => (
        <>
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-primary">{report.clientName}</DialogTitle>
                <DialogDescription>
                    Relatório detalhado do erro. Técnico: {report.technicianName}
                </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong className='block text-muted-foreground'>Data do Erro</strong> {report.errorDate ? format(new Date(report.errorDate), 'dd/MM/yyyy') : 'N/A'}</div>
                    <div><strong className='block text-muted-foreground'>Data de Geração</strong> {report.generatedAt ? format(report.generatedAt.toDate(), 'dd/MM/yyyy HH:mm') : 'N/A'}</div>
                </div>
                <div>
                    <strong className='block text-muted-foreground mb-1'>Status do Relatório</strong>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${report.status === 'concluded' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                    {report.status === 'concluded' ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {report.status === 'concluded' ? 'Concluído' : 'Aberto'}
                    </div>
                </div>
                
                <div>
                    <strong className='block text-muted-foreground mb-1'>Relatório Detalhado</strong>
                    <p className="text-sm bg-muted/50 p-4 rounded-md border whitespace-pre-wrap">{report.reportText}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <strong className='block text-muted-foreground mb-2'>Anexo de Mídia</strong>
                        {report.mediaUrl ? (
                            <div className="space-y-2">
                                {isImage && <img src={report.mediaUrl} alt="Anexo de mídia" className="rounded-lg border max-w-full h-auto" />}
                                {isVideo && <video src={report.mediaUrl} controls className="rounded-lg border max-w-full h-auto" />}
                                <Button asChild variant="outline" size="sm">
                                    <a href={report.mediaUrl} download={getFileName('media')}>
                                        {isImage && <Image className="mr-2 h-4 w-4" />}
                                        {isVideo && <Video className="mr-2 h-4 w-4" />}
                                        {!isImage && !isVideo && <FileText className="mr-2 h-4 w-4" />}
                                        Baixar Mídia
                                        <Download className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        ) : <p className='text-xs text-muted-foreground'>Nenhuma mídia anexada.</p>}
                    </div>
                    <div>
                        <strong className='block text-muted-foreground mb-2'>Banco de dados salvo no PC?</strong>
                        <div className='flex items-center gap-2 text-sm'>
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium capitalize">{report.databaseSavedOnPC}</span>
                        </div>
                    </div>
                </div>
            </div>
            <Separator />
            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 w-full">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o relatório.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                    <Button variant="secondary" size="sm" onClick={handleDownload}><DownloadCloud className="mr-2 h-4 w-4" /> Baixar (.pdf)</Button>
                    <DialogClose asChild>
                            <Button size="sm" onClick={handleStatusChange}>
                            {report.status === 'open' ? (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Marcar como Concluído
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reabrir Relatório
                                </>
                            )}
                        </Button>
                    </DialogClose>
                </div>
            </DialogFooter>
        </>
    );


    return (
        <Dialog onOpenChange={(open) => !open && setIsEditing(false)}>
            <DialogTrigger asChild>
                <Card className="break-inside-avoid cursor-pointer hover:border-primary transition-all group">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{report.clientName}</CardTitle>
                                <CardDescription>Técnico: {report.technicianName}</CardDescription>
                            </div>
                            <div className="text-xs text-muted-foreground text-right shrink-0 ml-2 flex flex-col items-end">
                                <span>{report.errorDate ? format(new Date(report.errorDate), 'dd/MM/yyyy') : 'Data inválida'}</span>
                                <span className="flex items-center gap-1 mt-1">
                                {report.status === 'concluded' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Circle className="h-4 w-4 text-amber-500" />
                                )}
                                {report.status === 'concluded' ? 'Concluído' : 'Aberto'}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm bg-muted/50 p-3 rounded-md border line-clamp-3">{report.reportText}</p>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                {isEditing ? <EditView /> : <DetailView />}
            </DialogContent>
        </Dialog>
    )
}

export function ReportList() {
  const { firestore } = useFirebase();

  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const reportsCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !appId) return null;
    return query(
        collection(firestore, `artifacts/${appId}/public/data/error_reports`), 
        orderBy('generatedAt', 'desc')
    );
  }, [firestore, appId]);

  const { data: reports, isLoading, error } = useCollection<ErrorReport>(reportsCollectionQuery);

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao Carregar Relatórios</AlertTitle>
        <AlertDescription>
          Não foi possível buscar os relatórios. Verifique sua conexão e as permissões do Firebase.
          <p className="text-xs mt-2 font-mono">{error.message}</p>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!reports || reports.length === 0) {
    return (
        <div className="text-center py-10 border-2 border-dashed rounded-lg mt-4">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Nenhum relatório encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Nenhum relatório foi enviado ainda.</p>
        </div>
    )
  }

  return (
    <div className="space-y-4 pt-4">
      {reports.map((report) => (
        <ReportItem key={report.id} report={report} />
      ))}
    </div>
  );
}
