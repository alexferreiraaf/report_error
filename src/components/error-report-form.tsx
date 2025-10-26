'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { reportSchema } from '@/lib/definitions';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Clock, File, Loader2, Send } from 'lucide-react';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

type ReportFormValues = z.infer<typeof reportSchema>;

async function uploadFile(file: File, folder: string): Promise<string | null> {
    if (!file || file.size === 0) return null;
    const storage = getStorage();
    const uniqueId = Date.now();
    const filePath = `error_reports/${folder}/${uniqueId}_${file.name}`;
    const fileRef = ref(storage, filePath);
  
    const snapshot = await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
  
    return downloadUrl;
  }

export function ErrorReportForm() {
  const { toast } = useToast();
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      clientName: '',
      technicianName: '',
      errorDate: '',
      reportText: '',
      mediaFile: undefined,
      zipFile: undefined,
      reportedByUserId: '',
      status: 'open',
    },
  });

  const mediaFile = form.watch('mediaFile');
  const zipFile = form.watch('zipFile');

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
    if (user) {
      form.setValue('reportedByUserId', user.uid);
    }
  }, [user, isUserLoading, auth, form]);


  const onSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    if (!firestore || !user) {
      const errorMsg = "Autenticação ou serviço de banco de dados não disponível. Aguarde e tente novamente.";
      setFormError(errorMsg);
      setIsSubmitting(false);
      return;
    }

    try {
      const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
      if (!appId) {
        throw new Error('ID da aplicação Firebase não configurado no ambiente.');
      }
      
      const mediaUrl = data.mediaFile ? await uploadFile(data.mediaFile, 'midia') : null;
      const zipUrl = data.zipFile ? await uploadFile(data.zipFile, 'banco_de_dados') : null;

      const reportsCollectionRef = collection(firestore, `artifacts/${appId}/public/data/error_reports`);

      const reportData = {
        clientName: data.clientName,
        technicianName: data.technicianName,
        errorDate: data.errorDate,
        reportText: data.reportText,
        mediaUrl: mediaUrl,
        zipUrl: zipUrl,
        reportedByUserId: user.uid,
        generatedAt: serverTimestamp(),
        status: 'open',
      };
      
      await addDoc(reportsCollectionRef, reportData);

      toast({
        title: 'Sucesso!',
        description: '✅ Relatório de erro enviado com sucesso!',
      });
      form.reset();

    } catch (error: any) {
      console.error('Falha no envio do relatório:', error);
      const errorMessage = `Ocorreu um erro inesperado: ${error.message || 'Por favor, tente novamente.'}`;
      setFormError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Erro ao Enviar Relatório',
        description: 'Por favor, verifique a mensagem de erro acima do formulário.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span className="text-lg font-medium">Carregando autenticação...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      {formError && (
         <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha no Envio</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
         </Alert>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="reportedByUserId"
            render={({ field }) => <Input {...field} type="hidden" />}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome do Cliente <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                    <Input placeholder="Nome ou ID do cliente afetado" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="technicianName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome do Técnico <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="errorDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data em que o Erro Apareceu <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="mediaFile"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem className="pt-4 border-t border-border">
              <FormLabel>Anexo de Mídia (Foto ou Vídeo)</FormLabel>
              <FormControl>
                <Input type="file" accept="image/*,video/*" onChange={(e) => onChange(e.target.files ? e.target.files[0] : undefined)} {...rest}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </FormControl>
              {mediaFile && <span className="text-xs text-primary/80 truncate flex items-center"><File className="w-3 h-3 inline mr-1" /> {mediaFile.name}</span>}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="zipFile"
          render={({ field: { onChange, value, ...rest } }) => (
            <FormItem className="pt-4 border-t border-border">
              <FormLabel>Arquivo Zipado do Banco de Dados (.zip)</FormLabel>
              <FormControl>
                <Input type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={(e) => onChange(e.target.files ? e.target.files[0] : undefined)} {...rest} 
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </FormControl>
              {zipFile && <span className="text-xs text-primary/80 truncate flex items-center"><File className="w-3 h-3 inline mr-1" /> {zipFile.name}</span>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reportText"
          render={({ field }) => (
            <FormItem className="pt-4 border-t border-border">
              <FormLabel>Relatório Detalhado do Problema <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Descreva o problema, as etapas para reproduzir e o impacto no cliente."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-center justify-between text-sm p-3 rounded-lg border bg-muted/50 text-muted-foreground">
            <div className="font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary" />
              Data de Geração do Relatório:
            </div>
            <div className="text-sm font-mono text-primary/80">
              Gerada automaticamente no envio.
            </div>
        </div>

        <Button type="submit" className="w-full rounded-full" size="lg" disabled={isSubmitting || isUserLoading || !user}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Gerar e Enviar Relatório
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
