import { ErrorReportForm } from '@/components/error-report-form';
import { ReportList } from '@/components/report-list';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-muted/20">
      <div className="container mx-auto p-4 py-8 md:py-12 lg:py-16">
        <ThemeToggle />
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <Card className="shadow-2xl">
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
          </div>
          <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-primary">Relatórios Enviados</h2>
              <Separator />
              <ReportList />
          </div>
        </main>
      </div>
    </div>
  );
}
