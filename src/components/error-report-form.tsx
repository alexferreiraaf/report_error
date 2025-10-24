'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getStorage } from 'firebase/storage';

type ReportFormValues = z.infer<typeof reportSchema>;

async function uploadFile(
  file: File,
  folder: string
): Promise<string | null> {
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
  const formRef = useRef<HTMLFormElement>(null);

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

    if (!firestore) {
      setFormError("O serviço de banco de dados não está disponível.");
      setIsSubmitting(false);
      return;
    }

    try {
      const mediaUrl = await uploadFile(data.mediaFile as File, 'midia');
      const zipUrl = await uploadFile(data.zipFile as File, 'banco_de_dados');
      
      const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
      if (!appId) {
        throw new Error('Firebase App ID is not configured.');
      }
      
      const reportsCollectionRef = collection(firestore, `artifacts/${appId}/public/data/error_reports`);

      await addDoc(reportsCollectionRef, {
        clientName: data.clientName,
        technicianName: data.technicianName,
        errorDate: data.errorDate,
        reportText: data.reportText,
        mediaUrl: mediaUrl || null,
        zipUrl: zipUrl || null,
        reportedByUserId: data.reportedByUserId,
        generatedAt: serverTimestamp(),
      });


      toast({
        title: 'Sucesso!',
        description: '✅ Relatório de erro enviado com sucesso!',
      });
      form.reset();
      formRef.current?.reset();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Erro ao enviar relatório:', error);
      setFormError(`Falha ao enviar o relatório. Erro: ${error.message}`);
      toast({
        variant: 'destructive',
        title: 'Erro no Envio',
        description: `Falha ao enviar o relatório. Erro: ${error.message}`,
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
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
         </Alert>
      )}
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Input type="file" accept="image/*,video/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest}
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
                <Input type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={(e) => onChange(e.target.files?.[0])} {...rest} 
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
