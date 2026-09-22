import React from 'react';
import { Metadata } from 'next';
import { FileCode2, Upload, FileText, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Configuración de Plantillas | Emblema Nexus',
  description: 'Gestión de plantillas documentales',
};

export default function PlantillasPage() {
  const templates = [
    { id: '1', name: 'Contrato de Compra-Venta Inmueble', category: 'Legal', lastUpdated: '10/09/2026', variables: 12 },
    { id: '2', name: 'Poder de Representación Especial', category: 'Legal', lastUpdated: '05/09/2026', variables: 8 },
    { id: '3', name: 'Instancia de Solicitud de Deslinde', category: 'Agrimensura', lastUpdated: '15/08/2026', variables: 15 },
    { id: '4', name: 'Declaración Jurada de Posesión', category: 'Legal', lastUpdated: '01/09/2026', variables: 6 },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileCode2 className="h-8 w-8 text-slate-700" />
            Catálogo de Plantillas
          </h2>
          <p className="text-slate-500">
            Administre las plantillas maestras DOCX utilizadas para la generación automática de documentos.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button className="bg-slate-800 hover:bg-slate-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {templates.map(template => (
          <Card key={template.id} className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-slate-100 rounded-md">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <Badge variant="outline" className="bg-slate-50">
                  {template.category}
                </Badge>
              </div>
              <CardTitle className="text-lg text-slate-800 line-clamp-2 leading-tight">
                {template.name}
              </CardTitle>
              <CardDescription>
                Actualizado: {template.lastUpdated}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 flex-grow">
              <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                <span className="font-medium">{template.variables} variables</span> configuradas
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-100 mt-2">
              <Button variant="ghost" className="w-full text-slate-600 hover:text-slate-900 justify-between">
                <span>Configurar variables</span>
                <Settings className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}

        <Card className="shadow-sm border-slate-200 border-dashed bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-center items-center min-h-[220px] cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 mb-2">
              <Upload className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="font-medium text-slate-900">Subir Plantilla DOCX</h3>
            <p className="text-sm text-slate-500 max-w-[200px]">
              Arrastre un archivo para crear una nueva plantilla base
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
