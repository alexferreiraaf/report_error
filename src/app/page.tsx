
import { ErrorReportForm } from '@/components/error-report-form';
import { ReportList } from '@/components/report-list';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl py-8 md:py-12">
        <ThemeToggle />
        <main className="flex flex-col items-center gap-8 w-full">
          <Card className="shadow-2xl w-full">
            <CardHeader className="border-b">
              <CardTitle className="text-3xl font-extrabold text-primary">
                Relatório de Erros do Sistema
              </CardTitle>
              <CardDescription className="pt-1">
                Preencha as informações para registrar um novo erro de cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ErrorReportForm />
            </CardContent>
          </Card>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full max-w-sm rounded-full">
                <FileText className="mr-2 h-4 w-4" />
                Ver Relatórios Enviados
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight text-primary">Relatórios Enviados</DialogTitle>
                <DialogDescription>
                  Aqui estão os últimos relatórios de erro que foram submetidos.
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="flex-1 overflow-y-auto pr-6 -mr-6">
                <ReportList />
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

    