'use client';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, Download, FileText, Image, Video, FileArchive } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';

interface ErrorReport {
  id: string;
  clientName: string;
  technicianName: string;
  errorDate: string;
  reportText: string;
  mediaUrl?: string | null;
  zipUrl?: string | null;
  generatedAt: Timestamp;
}

function ReportItem({ report }: { report: ErrorReport }) {
    // Verifica se a URL de mídia é uma string base64 de imagem ou vídeo
    const isImage = report.mediaUrl && report.mediaUrl.startsWith('data:image');
    const isVideo = report.mediaUrl && report.mediaUrl.startsWith('data:video');
    const isZip = report.zipUrl && report.zipUrl.startsWith('data:application');

    // Extrai o nome do arquivo para o download, se aplicável
    const getFileName = (fileType: 'media' | 'zip') => {
        const date = format(report.generatedAt.toDate(), 'yyyy-MM-dd_HH-mm');
        if (fileType === 'media') {
            if (isImage) return `media_${report.clientName}_${date}.png`;
            if (isVideo) return `media_${report.clientName}_${date}.mp4`;
        }
        if (fileType === 'zip' && isZip) {
            return `database_${report.clientName}_${date}.zip`;
        }
        return 'download';
    }


    return (
        <Card className="break-inside-avoid">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold">{report.clientName}</CardTitle>
                        <CardDescription>Técnico: {report.technicianName}</CardDescription>
                    </div>
                    <div className="text-xs text-muted-foreground text-right shrink-0 ml-2">
                        <p>{format(new Date(report.errorDate), 'dd/MM/yyyy')}</p>
                        <p>{report.generatedAt ? format(report.generatedAt.toDate(), 'HH:mm') : ''}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm bg-muted/50 p-3 rounded-md border">{report.reportText}</p>
                <div className="flex gap-2 flex-wrap">
                    {report.mediaUrl && (
                         <Button asChild variant="outline" size="sm">
                             <a href={report.mediaUrl} download={getFileName('media')}>
                                {isImage && <Image className="mr-2" />}
                                {isVideo && <Video className="mr-2" />}
                                {!isImage && !isVideo && <FileText className="mr-2" />}
                                 Baixar Mídia
                                 <Download className="ml-2 h-4 w-4" />
                             </a>
                         </Button>
                    )}
                    {report.zipUrl && (
                        <Button asChild variant="outline" size="sm">
                            <a href={report.zipUrl} download={getFileName('zip')}>
                                <FileArchive className="mr-2" />
                                Baixar ZIP
                                <Download className="ml-2 h-4 w-4" />
                            </a>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
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
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Nenhum relatório encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Comece enviando um novo relatório de erro.</p>
        </div>
    )
  }

  return (
    <div className="space-y-4 columns-1 md:columns-2 lg:columns-1">
      {reports.map((report) => (
        <ReportItem key={report.id} report={report} />
      ))}
    </div>
  );
}
