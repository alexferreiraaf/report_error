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
import { AlertTriangle, Download, FileText, Image, Video, FileArchive, CheckCircle, Trash2, Check, DownloadCloud, Circle, RefreshCw, Edit, Save, X, Loader2 } from 'lucide-react';
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

interface ErrorReport {
  id: string;
  clientName: string;
  technicianName: string;
  errorDate: string;
  reportText: string;
  mediaUrl?: string | null;
  zipUrl?: string | null;
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
            zipFile: undefined,
        },
    });

    const isImage = report.mediaUrl && !report.mediaUrl.startsWith('data:video');
    const isVideo = report.mediaUrl && report.mediaUrl.startsWith('data:video');

    const handleStatusChange = async () => {
        if (!firestore) return;
        const reportRef = doc(firestore, `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/public/data/error_reports`, report.id);
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
        const reportRef = doc(firestore, `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/public/data/error_reports`, report.id);
        
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
        const reportContent = `
Relatório de Erro
=================
Cliente: ${report.clientName}
Técnico: ${report.technicianName}
Data do Erro: ${report.errorDate}
Data de Geração: ${report.generatedAt ? format(report.generatedAt.toDate(), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}
Status: ${report.status === 'open' ? 'Aberto' : 'Concluído'}
-----------------

Descrição do Problema:
${report.reportText}

-----------------
Links de Anexos:
Mídia: ${report.mediaUrl ? 'Anexo disponível' : 'Nenhum'}
ZIP: ${report.zipUrl ? 'Anexo disponível' : 'Nenhum'}
`;
        const blob = new Blob([reportContent.trim()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${report.clientName}_${report.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getFileName = (fileType: 'media' | 'zip') => {
        const date = report.generatedAt ? format(report.generatedAt.toDate(), 'yyyy-MM-dd_HH-mm') : 'data_desconhecida';
        
        if (fileType === 'media') {
            if (isImage) return `media_${report.clientName}_${date}.png`;
            if (isVideo) return `media_${report.clientName}_${date}.mp4`;
        }
        if (fileType === 'zip') {
            return `database_${report.clientName}_${date}.zip`;
        }
        return 'download';
    }

    const onUpdate: SubmitHandler<ReportFormValues> = async (data) => {
        if (!firestore) return;
        setIsUpdating(true);
        const reportRef = doc(firestore, `artifacts/${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}/public/data/error_reports`, report.id);

        // We only update the text fields. File uploads are not part of the edit functionality for simplicity.
        const updatedData = {
            clientName: data.clientName,
            technicianName: data.technicianName,
            errorDate: data.errorDate,
            reportText: data.reportText,
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

                <div>
                    <strong className='block text-muted-foreground mb-2'>Anexos</strong>
                    <div className="flex gap-2 flex-wrap">
                       {report.mediaUrl ? (
                            <Button asChild variant="outline" size="sm">
                                <a href={report.mediaUrl} download={getFileName('media')}>
                                    {isImage && <Image className="mr-2 h-4 w-4" />}
                                    {isVideo && <Video className="mr-2 h-4 w-4" />}
                                    {!isImage && !isVideo && <FileText className="mr-2 h-4 w-4" />}
                                    Baixar Mídia
                                    <Download className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                        ) : <p className='text-xs text-muted-foreground'>Nenhuma mídia anexada.</p>}

                        {report.zipUrl ? (
                            <Button asChild variant="outline" size="sm">
                                <a href={report.zipUrl} download={getFileName('zip')}>
                                    <FileArchive className="mr-2 h-4 w-4" />
                                    Baixar ZIP
                                    <Download className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                        ) : <p className='text-xs text-muted-foreground'>Nenhum ZIP anexado.</p>}
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
                    <Button variant="secondary" size="sm" onClick={handleDownload}><DownloadCloud className="mr-2 h-4 w-4" /> Baixar (.txt)</Button>
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

    