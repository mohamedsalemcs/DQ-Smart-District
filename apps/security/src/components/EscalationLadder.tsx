import { Check } from 'lucide-react';
import { useStore } from '@dq/core';

/** RTL stepper — step 0 is rightmost (§6.4). Reads the ladder from Settings, never a hardcoded copy. */
export function EscalationLadder({ currentStep }: { currentStep: number }) {
  const ladder = useStore((s) => s.settings.ladder);
  return (
    <ol className="flex items-start gap-0">
      {ladder.map((step, i) => {
        const reached = i <= currentStep;
        const isCurrent = i === currentStep;
        return (
          <li key={step.step} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : reached ? 'bg-brand-600' : 'bg-ink-100'}`} />
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-bold ${
                  isCurrent
                    ? 'bg-brand-600 text-ink-900 ring-4 ring-brand-500/25'
                    : reached
                      ? 'bg-brand-50 text-ink-900'
                      : 'bg-ink-100 text-ink-500'
                }`}
              >
                {reached && !isCurrent ? <Check size={13} /> : step.step}
              </span>
              <div className={`h-0.5 flex-1 ${i === ladder.length - 1 ? 'opacity-0' : i < currentStep ? 'bg-brand-600' : 'bg-ink-100'}`} />
            </div>
            <p className={`mt-1.5 text-caption font-medium leading-tight ${reached ? '' : 'text-ink-500'}`}>{step.labelAr}</p>
          </li>
        );
      })}
    </ol>
  );
}
