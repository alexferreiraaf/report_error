import { ErrorReportForm } from '@/components/error-report-form';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <ThemeToggle />
      <main className="w-full max-w-2xl">
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
      </main>
    </div>
  );
}
