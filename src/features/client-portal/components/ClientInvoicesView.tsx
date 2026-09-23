'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Receipt,
  Download,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { ClientInvoice } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ClientInvoicesView() {
  const { invoices, openEcfPrintModal } = useClientPortalStore();
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === 'pending') return inv.status === 'pending' || inv.status === 'partially_paid';
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  // Cálculos de totales
  const totalDop = invoices
    .filter((inv) => inv.currency === 'DOP')
    .reduce((sum, inv) => sum + inv.total, 0);

  const balanceDop = invoices
    .filter((inv) => inv.currency === 'DOP')
    .reduce((sum, inv) => sum + inv.balance, 0);

  const totalUsd = invoices
    .filter((inv) => inv.currency === 'USD')
    .reduce((sum, inv) => sum + inv.total, 0);

  const balanceUsd = invoices
    .filter((inv) => inv.currency === 'USD')
    .reduce((sum, inv) => sum + inv.balance, 0);

  const getStatusBadge = (status: ClientInvoice['status']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pagada
          </Badge>
        );
      case 'partially_paid':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">
            <Clock className="w-3 h-3 mr-1" />
            Abono Parcial
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendiente de Pago
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-xs font-semibold">
            Vencida
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de Resumen de Facturación */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Total Facturado (DOP)
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-slate-900">
              RD${' '}
              {totalDop.toLocaleString('es-DO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Comprobantes electrónicos e-CF emitidos
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Saldo Pendiente (DOP)
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-amber-700">
              RD${' '}
              {balanceDop.toLocaleString('es-DO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            {balanceDop === 0
              ? 'Todas las facturas en pesos están al día'
              : 'Pendiente de liquidación o transferencia'}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase font-bold text-slate-500">
              Saldo Pendiente (USD)
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono text-slate-900">
              ${' '}
              {balanceUsd.toLocaleString('es-DO', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500">
            Total contratado en divisas: ${totalUsd.toLocaleString('es-DO')}
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Facturación & Comprobantes Fiscales</h3>
          <p className="text-xs text-slate-500">
            Representaciones oficiales e-CF registradas ante la DGII bajo la Ley 32-23.
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({invoices.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendientes de Pago
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === 'paid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Saldadas
          </button>
        </div>
      </div>

      {/* Lista de Facturas */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
                  <Receipt className="w-5 h-5 text-slate-800" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {invoice.eNcf}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-slate-300">
                      {invoice.invoiceNumber}
                    </Badge>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expediente: <strong className="text-slate-700">{invoice.caseNumber || 'N/A'}</strong> • Emisión: {invoice.issueDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-900">
                    {invoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                    {invoice.total.toLocaleString('es-DO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    Saldo:{' '}
                    <span
                      className={`font-mono font-bold ${
                        invoice.balance > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {invoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                      {invoice.balance.toLocaleString('es-DO', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => openEcfPrintModal(invoice)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Ver e-CF
                </Button>
              </div>
            </div>

            {/* Ítems del comprobante */}
            <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                Conceptos Facturados
              </span>
              {invoice.items.map((it) => (
                <div key={it.id} className="flex justify-between text-slate-700">
                  <span>{it.description}</span>
                  <span className="font-mono font-medium">
                    {invoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                    {it.total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Recibos de Pago Asociados si existen */}
            {invoice.paymentReceipts.length > 0 && (
              <div className="text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                  Abonos y Recibos Registrados
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {invoice.paymentReceipts.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2 bg-emerald-50/60 rounded border border-emerald-200 text-emerald-900 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold">{rec.date}</span>
                        <div className="text-[11px] text-emerald-800">
                          {rec.paymentMethod} (Ref: {rec.reference})
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-800">
                        + {invoice.currency === 'USD' ? '$' : 'RD$'}{' '}
                        {rec.amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validación DGII */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                DGII: {invoice.dgiiStatus} (TrackID: {invoice.trackIdDgii})
              </span>
              <span>Cód. Seguridad: <strong className="font-mono text-slate-700">{invoice.securityCode}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
