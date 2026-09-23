import React from 'react';
import { Metadata } from 'next';
import { Search, Filter, FolderKanban } from 'lucide-react';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Gestión Documental | Emblema Nexus',
  description: 'Explorador general de documentos de la empresa',
};

export default function DocumentosPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FolderKanban className="h-8 w-8 text-slate-700" />
            Explorador de Documentos
          </h2>
          <p className="text-slate-500">
            Gestión centralizada de toda la documentación corporativa y de expedientes.
          </p>
        </div>
      </div>

      <Tabs defaultValue="todos" className="space-y-4 mt-6">
        <TabsList className="bg-slate-100/50 p-1">
          <TabsTrigger value="todos">Todos los Documentos</TabsTrigger>
          <TabsTrigger value="legal">Área Legal</TabsTrigger>
          <TabsTrigger value="agrimensura">Agrimensura</TabsTrigger>
          <TabsTrigger value="inmobiliaria">Inmobiliaria</TabsTrigger>
        </TabsList>
        
        <TabsContent value="todos" className="space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-slate-800">Directorio Global</CardTitle>
              <CardDescription>
                Búsqueda global a través de todas las áreas de la empresa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="legal">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-6">
              <DocumentList documents={[]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agrimensura">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-6">
              <DocumentList documents={[]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
