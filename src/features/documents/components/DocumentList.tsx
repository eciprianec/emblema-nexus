'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, Download, History, RefreshCw, CheckCircle, 
  XCircle, Clock, AlertCircle, FileStack, Search, Filter 
} from 'lucide-react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { DocumentVersionHistory } from './DocumentVersionHistory';

export type DocumentStatus = 'Borrador' | 'En revisión' | 'Aprobado' | 'Firmado' | 'Obsoleto';

export interface DocumentRecord {
  id: string;
  name: string;
  version: string;
  size: number;
  status: DocumentStatus;
  date: Date;
  type: string;
}

const getStatusBadge = (status: DocumentStatus) => {
  switch (status) {
    case 'Aprobado':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"><CheckCircle className="w-3 h-3 mr-1" /> Aprobado</Badge>;
    case 'Firmado':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"><FileText className="w-3 h-3 mr-1" /> Firmado</Badge>;
    case 'En revisión':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"><Clock className="w-3 h-3 mr-1" /> En revisión</Badge>;
    case 'Borrador':
      return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200"><FileStack className="w-3 h-3 mr-1" /> Borrador</Badge>;
    case 'Obsoleto':
      return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200"><XCircle className="w-3 h-3 mr-1" /> Obsoleto</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function DocumentList({ documents = [] }: { documents?: DocumentRecord[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Mock data if none provided
  const data = documents.length > 0 ? documents : [
    { id: '1', name: 'Contrato de Servicios - Final.docx', version: 'v3', size: 1024 * 500, status: 'Firmado' as DocumentStatus, date: new Date(2026, 8, 15), type: 'Legal' },
    { id: '2', name: 'Plano Mensura_Lote4B.pdf', version: 'v1', size: 1024 * 1024 * 2.5, status: 'En revisión' as DocumentStatus, date: new Date(2026, 8, 20), type: 'Agrimensura' },
    { id: '3', name: 'Copia Cédula Propietario.jpg', version: 'v1', size: 1024 * 250, status: 'Aprobado' as DocumentStatus, date: new Date(2026, 8, 10), type: 'Identificación' },
    { id: '4', name: 'Borrador Poder Especial.docx', version: 'v2', size: 1024 * 120, status: 'Borrador' as DocumentStatus, date: new Date(2026, 8, 22), type: 'Legal' },
  ];

  const filteredData = data.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openHistory = (id: string) => {
    setSelectedDocId(id);
    setHistoryOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Buscar documentos..." 
            className="pl-9 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="text-slate-600 bg-white">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">Nombre del Documento</TableHead>
              <TableHead className="font-semibold text-slate-700">Versión</TableHead>
              <TableHead className="font-semibold text-slate-700 hidden md:table-cell">Tamaño</TableHead>
              <TableHead className="font-semibold text-slate-700">Estado</TableHead>
              <TableHead className="font-semibold text-slate-700 hidden sm:table-cell">Fecha</TableHead>
              <TableHead className="text-right font-semibold text-slate-700">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  No se encontraron documentos
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {doc.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 font-mono text-xs">
                      {doc.version}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 hidden md:table-cell text-sm">
                    {formatSize(doc.size)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(doc.status)}
                  </TableCell>
                  <TableCell className="text-slate-500 hidden sm:table-cell text-sm">
                    {format(doc.date, "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <AlertCircle className="h-4 w-4 rotate-90 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                          <Download className="mr-2 h-4 w-4" />
                          <span>Descargar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openHistory(doc.id)}>
                          <History className="mr-2 h-4 w-4" />
                          <span>Ver Historial</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          <span>Subir Nueva Versión</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-blue-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <span>Aprobar Documento</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <DocumentVersionHistory 
        documentId={selectedDocId || ''} 
        open={historyOpen} 
        onOpenChange={setHistoryOpen} 
      />
    </div>
  );
}
