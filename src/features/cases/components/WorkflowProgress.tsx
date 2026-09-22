export function WorkflowProgress({ currentStep, detailed = false }: { currentStep: number, detailed?: boolean }) {
  const steps = [
    { id: 1, name: "Recepción", status: "completed" },
    { id: 2, name: "Evaluación", status: "completed" },
    { id: 3, name: "Trámite Interno", status: "current" },
    { id: 4, name: "Firma / Aprobación", status: "upcoming" },
    { id: 5, name: "Cierre", status: "upcoming" }
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-slate-200" aria-hidden="true"></div>
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex flex-col items-center group">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 bg-white ${
              step.status === 'completed' ? 'border-green-500 text-green-500' :
              step.status === 'current' ? 'border-slate-900 text-slate-900' :
              'border-slate-300 text-slate-300'
            }`}>
              {step.status === 'completed' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            <span className={`mt-2 text-xs font-medium ${
              step.status === 'completed' ? 'text-green-600' :
              step.status === 'current' ? 'text-slate-900' :
              'text-slate-400'
            }`}>{step.name}</span>
            {detailed && step.status === 'current' && (
              <span className="mt-1 text-[10px] text-slate-500 uppercase">En progreso</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
