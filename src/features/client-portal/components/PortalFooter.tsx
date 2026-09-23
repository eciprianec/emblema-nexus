'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Mail, Phone, MapPin, Scale, Clock, ExternalLink } from 'lucide-react';

export function PortalFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Columna 1: Firma & Respaldo */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded bg-white text-slate-950 font-bold flex items-center justify-center text-sm">
                EN
              </div>
              <span className="text-white font-bold text-base tracking-tight">
                EMBLEMA NEXUS
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Firma consultora multidisciplinaria líder en República Dominicana.
              Especialistas en Derecho Inmobiliario, Mensuras Catastrales, Saneamiento y Litigios de Tierras.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                <Scale className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
                Matrícula CARD & CODIA
              </span>
            </div>
          </div>

          {/* Columna 2: Ubicación & Contacto */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Sede Principal & Contacto
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start">
                <MapPin className="w-4 h-4 mr-2 text-slate-400 shrink-0 mt-0.5" />
                <span>Torre Empresarial Piantini, Piso 11, Av. Winston Churchill esq. 27 de Febrero, Santo Domingo, D.N.</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <span>(809) 566-0099 / (809) 566-0098</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <span>portal@emblemanexus.com</span>
              </li>
              <li className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                <span>Lunes a Viernes: 8:30 AM – 5:30 PM</span>
              </li>
            </ul>
          </div>

          {/* Columna 3: Enlaces de Acceso y Servicios */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Servicios del Portal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/portal" className="hover:text-white transition-colors">
                  Panel de Expedientes del Cliente
                </Link>
              </li>
              <li>
                <Link href="/portal/tracking" className="hover:text-white transition-colors">
                  Consulta Pública de Expediente (TRK)
                </Link>
              </li>
              <li>
                <Link href="/portal/consulta" className="hover:text-white transition-colors">
                  Solicitud de Consulta Jurídica y Topográfica
                </Link>
              </li>
              <li>
                <Link href="/portal/login" className="hover:text-white transition-colors">
                  Acceso con Magic Link / Código PIN
                </Link>
              </li>
              <li>
                <a
                  href="https://dgii.gov.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-slate-400 hover:text-white"
                >
                  <span>Consulta de Comprobantes e-CF en DGII</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 4: Cumplimiento y Seguridad */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Seguridad & Cumplimiento
            </h4>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 text-xs space-y-2">
              <div className="flex items-center text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Confidencialidad Profesional
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Toda la información documental y técnica está protegida por el Secreto Profesional de la Abogacía (Ley 91) y la Ley 172-13 sobre Protección de Datos Personales.
              </p>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                RNC: 1-32-45892-1 • Emisor e-CF Autorizado por DGII
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior de copyright y términos legales */}
        <div className="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Emblema Nexus SRL. Todos los derechos reservados.</p>
          <div className="flex items-center space-x-6 text-[11px]">
            <span className="hover:text-slate-300 cursor-pointer">Aviso de Privacidad Legal</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Términos de Uso del Portal</span>
            <span>•</span>
            <span className="hover:text-slate-300 cursor-pointer">Política de Seguridad e-CF</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
