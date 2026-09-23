"use server";

import "server-only";
import { CaseFormValues, caseSchema } from "../schemas/case-schema";

// Utilidad simulada para generar el número
function generate_case_number(area: string) {
  const prefix = area.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

export async function createCaseAction(data: CaseFormValues) {
  const parsed = caseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() };
  }

  const caseNumber = generate_case_number(parsed.data.area);
  
  return { 
    success: true, 
    data: { id: "case_" + Date.now(), numero: caseNumber, ...parsed.data } 
  };
}

export async function changeCaseStageAction(caseId: string, newStage: string) {
  return { success: true, caseId, newStage };
}

export async function addParticipantAction(caseId: string, participantId: string, role: string) {
  return { success: true };
}

export async function addExtraordinaryProcessAction(caseId: string, processDetails: string) {
  return { success: true };
}

export async function listCasesAction(filters?: { area?: string, status?: string }) {
  return {
    success: true,
    data: []
  };
}
