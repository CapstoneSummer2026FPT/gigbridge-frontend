import { Check } from 'lucide-react';

export type PostJobFlowStep = 'choose' | 'details' | 'questions';

interface PostJobFlowStepperProps {
  activeStep: PostJobFlowStep;
}

const steps = [
  { key: 'details', number: 1, title: 'Job Details' },
  { key: 'questions', number: 2, title: 'Interview Questions' },
  { key: 'contract', number: 3, title: 'Contract Setup' },
  { key: 'esign', number: 4, title: 'E-Sign Contract' },
] as const;

const getStepState = (activeStep: PostJobFlowStep, stepKey: string): 'done' | 'active' | 'next' => {
  if (activeStep === 'choose') return 'next';
  if (activeStep === 'details') return stepKey === 'details' ? 'active' : 'next';
  if (activeStep === 'questions') {
    if (stepKey === 'details') return 'done';
    if (stepKey === 'questions') return 'active';
  }
  return 'next';
};

export function PostJobFlowStepper({ activeStep }: PostJobFlowStepperProps) {
  return (
    <div className="flex items-center justify-center w-full max-w-5xl mx-auto py-4 overflow-x-auto">
      {steps.map((step, index) => {
        const state = getStepState(activeStep, step.key);
        const isDone = state === 'done';
        const isActive = state === 'active';

        return (
          <div key={step.key} className="contents">
            <div className={`flex items-center gap-3 shrink-0 ${state === 'next' ? 'opacity-60' : ''}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md font-bold text-sm ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-[var(--gb-cyan)] text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check size={18} /> : step.number}
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] uppercase tracking-wider font-bold ${
                  isDone ? 'text-green-500' : isActive ? 'text-[var(--gb-cyan)]' : 'text-muted-foreground'
                }`}>
                  Step {step.number}
                </span>
                <span className={`text-xs font-bold ${isActive ? 'text-foreground' : isDone ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-grow mx-6 h-[2px] rounded-full opacity-60 min-w-8 ${
                isDone ? 'bg-green-500' : 'bg-border'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
