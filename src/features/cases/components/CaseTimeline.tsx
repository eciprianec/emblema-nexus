export function CaseTimeline({ caseId }: { caseId: string }) {
  const events: Array<{ id: number; type: string; title: string; desc: string; date: string }> = [];

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        No hay registros en la bitácora de este expediente aún.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true"></span>
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                    event.type === 'CREATION' ? 'bg-slate-900' :
                    event.type === 'STAGE_CHANGE' ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-slate-900 font-medium">{event.title}</p>
                    <p className="text-sm text-slate-500 mt-1">{event.desc}</p>
                  </div>
                  <div className="whitespace-nowrap text-right text-xs text-slate-500">
                    <time>{event.date}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
