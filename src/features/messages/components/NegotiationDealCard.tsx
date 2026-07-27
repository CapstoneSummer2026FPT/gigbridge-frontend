import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  FileText,
  Layers3,
  Loader2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../../hooks/useTranslation';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import type {
  MsgConversation,
  NegotiationMilestoneDto,
  NegotiationOfferDetailDto,
} from '../../../types/models/Message';

type DealStatus = NonNullable<MsgConversation['dealStatus']>;

interface NegotiationDealCardProps {
  offerId?: string | null;
  amount: number;
  detail?: NegotiationOfferDetailDto | null;
  status: DealStatus;
  isLatestOffer: boolean;
  canRespond: boolean;
  canNegotiate: boolean;
  actionBusy?: boolean;
  onAccept: (offerId?: string | null, amount?: number) => void | Promise<void>;
  onDecline: (offerId?: string | null) => void | Promise<void>;
}

function statusTone(status: DealStatus, isLatestOffer: boolean) {
  if (!isLatestOffer) return 'border-border bg-muted text-muted-foreground';
  if (status === 'agreed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'declined') return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300';
  if (status === 'pending_freelancer') return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(parsed);
}

function MilestoneDetail({
  milestone,
  index,
  untitledLabel,
  labels,
  language,
}: {
  milestone: NegotiationMilestoneDto;
  index: number;
  untitledLabel: string;
  labels: {
    description: string;
    deliverables: string;
    acceptance: string;
    workItems: string;
    noWorkItems: string;
    untitledWorkItem: string;
    duration: string;
  };
  language: string;
}) {
  const dueDate = formatDate(milestone.dueDate, language);

  return (
    <details className="group overflow-hidden rounded-2xl border border-border bg-card" open={index === 0}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 marker:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--gb-cyan)]/10 text-xs font-black text-[var(--gb-cyan)]">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-foreground">
              {milestone.title?.trim() || untitledLabel}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {milestone.estimatedDuration && (
                <span className="inline-flex items-center gap-1"><Clock3 size={12} />{milestone.estimatedDuration}</span>
              )}
              {dueDate && (
                <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{dueDate}</span>
              )}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-1 font-black text-[var(--gb-cyan)]">
            <GCoinIcon size={16} />
            {milestone.amount.toLocaleString(language)}
          </span>
          <ChevronDown size={17} className="text-muted-foreground transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="border-t border-border bg-muted/20 px-4 py-4">
        <dl className="space-y-4">
          <DetailField label={labels.description} value={milestone.description} />
          <DetailField label={labels.deliverables} value={milestone.deliverables} />
          <DetailField label={labels.acceptance} value={milestone.acceptanceCriteria} />
        </dl>
        <div className="mt-5">
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <Layers3 size={14} />
            {labels.workItems}
          </h4>
          {milestone.workItems?.length ? (
            <ol className="mt-2 space-y-2">
              {milestone.workItems.map((workItem, workIndex) => (
                <li key={workItem.id || workIndex} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {workIndex + 1}. {workItem.title?.trim() || labels.untitledWorkItem}
                  </p>
                  {workItem.description && (
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{workItem.description}</p>
                  )}
                  {workItem.estimatedDuration && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 size={12} />
                      <strong>{labels.duration}:</strong> {workItem.estimatedDuration}
                    </p>
                  )}
                  {workItem.deliverables && (
                    <p className="mt-2 text-xs leading-5 text-foreground">
                      <strong>{labels.deliverables}:</strong> {workItem.deliverables}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{labels.noWorkItems}</p>
          )}
        </div>
      </div>
    </details>
  );
}

export function NegotiationDealCard({
  offerId,
  amount,
  detail,
  status,
  isLatestOffer,
  canRespond,
  canNegotiate,
  actionBusy = false,
  onAccept,
  onDecline,
}: NegotiationDealCardProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const milestones = detail?.milestones ?? [];
  const workItemCount = useMemo(
    () => milestones.reduce((total, milestone) => total + (milestone.workItems?.length ?? 0), 0),
    [milestones],
  );
  const displayAmount = detail && Number.isFinite(detail.finalPrice) ? detail.finalPrice : amount;
  const createdAt = formatDate(detail?.createdAt, language);
  const startDate = formatDate(detail?.startDate, language);
  const endDate = formatDate(detail?.endDate, language);
  const canTakeAction = isLatestOffer && status === 'pending_freelancer' && canRespond && canNegotiate;
  const statusLabel = !isLatestOffer
    ? t('messages.deal.previousOffer')
    : t(`messages.deal.status.${status}`);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), summary, [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const closeModal = () => setIsOpen(false);
  const labels = {
    description: t('messages.deal.description'),
    deliverables: t('messages.deal.deliverables'),
    acceptance: t('messages.deal.acceptance'),
    workItems: t('messages.deal.workBreakdown'),
    noWorkItems: t('messages.deal.noWorkItems'),
    untitledWorkItem: t('messages.deal.untitledWorkItem'),
    duration: t('messages.deal.duration'),
  };

  return (
    <>
      <article className="msg-deal-card my-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]">
                <CreditCard size={19} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{t('messages.deal.title')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('messages.deal.subtitle')}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${statusTone(status, isLatestOffer)}`}>
              {statusLabel}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {t('messages.deal.finalBudget')}
              </p>
              <p className="mt-1 flex items-center gap-1 text-2xl font-black text-[var(--gb-cyan)]">
                <GCoinIcon size={22} />
                {displayAmount.toLocaleString(language)}
              </p>
            </div>
            <div className="flex gap-2 text-center">
              <div className="min-w-14 rounded-lg bg-muted/70 px-2 py-1.5">
                <p className="text-sm font-black text-foreground">{milestones.length}</p>
                <p className="text-[9px] uppercase text-muted-foreground">{t('messages.deal.milestones')}</p>
              </div>
              <div className="min-w-14 rounded-lg bg-muted/70 px-2 py-1.5">
                <p className="text-sm font-black text-foreground">{workItemCount}</p>
                <p className="text-[9px] uppercase text-muted-foreground">{t('messages.deal.tasks')}</p>
              </div>
            </div>
          </div>

          {detail === undefined ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 size={13} className="animate-spin" />
              {t('messages.deal.loadingDetails')}
            </p>
          ) : milestones.length ? (
            <ol className="mt-3 space-y-1.5 border-t border-border pt-3">
              {milestones.slice(0, 2).map((milestone, index) => (
                <li key={milestone.id || index} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-foreground">
                    <strong className="mr-1 text-muted-foreground">{index + 1}.</strong>
                    {milestone.title?.trim() || t('messages.deal.untitledMilestone')}
                  </span>
                  <span className="shrink-0 font-bold text-muted-foreground">
                    {milestone.amount.toLocaleString(language)}
                  </span>
                </li>
              ))}
              {milestones.length > 2 && (
                <li className="text-[11px] font-semibold text-[var(--gb-cyan)]">
                  {t('messages.deal.moreMilestones', { count: milestones.length - 2 })}
                </li>
              )}
            </ol>
          ) : (
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              {t('messages.deal.noMilestones')}
            </p>
          )}
        </div>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center justify-center gap-2 border-0 border-t border-border bg-muted/30 px-4 py-3 text-xs font-bold text-[var(--gb-cyan)] transition-colors hover:bg-[var(--gb-cyan)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gb-cyan)] focus-visible:ring-inset"
        >
          <FileText size={15} />
          {t('messages.deal.viewDetails')}
        </button>
      </article>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeModal();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`deal-dialog-title-${offerId || 'offer'}`}
            className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:max-h-[88vh] sm:max-w-3xl sm:rounded-3xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]">
                  <CreditCard size={21} />
                </span>
                <div className="min-w-0">
                  <h2 id={`deal-dialog-title-${offerId || 'offer'}`} className="truncate text-lg font-black text-foreground">
                    {t('messages.deal.detailTitle')}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t('messages.deal.detailSubtitle')}</p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeModal}
                aria-label={t('messages.deal.close')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gb-cyan)]"
              >
                <X size={18} />
              </button>
            </header>

            <div className="messages-custom-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <section className="grid gap-3 rounded-2xl border border-[var(--gb-cyan)]/25 bg-[var(--gb-cyan)]/5 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {t('messages.deal.finalBudget')}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-3xl font-black text-[var(--gb-cyan)]">
                    <GCoinIcon size={27} />
                    {displayAmount.toLocaleString(language)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusTone(status, isLatestOffer)}`}>
                    {statusLabel}
                  </span>
                  <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {t('messages.deal.summaryCount', { milestones: milestones.length, tasks: workItemCount })}
                  </span>
                </div>
              </section>

              {(createdAt || startDate || endDate) && (
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {createdAt && (
                    <div className="rounded-xl border border-border bg-card px-4 py-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        {t('messages.deal.offeredOn')}
                      </dt>
                      <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <CalendarDays size={14} className="text-[var(--gb-cyan)]" />
                        {createdAt}
                      </dd>
                    </div>
                  )}
                  {startDate && (
                    <div className="rounded-xl border border-border bg-card px-4 py-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        {t('messages.deal.startDate')}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{startDate}</dd>
                    </div>
                  )}
                  {endDate && (
                    <div className="rounded-xl border border-border bg-card px-4 py-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        {t('messages.deal.endDate')}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">{endDate}</dd>
                    </div>
                  )}
                </dl>
              )}

              {detail?.scopeSummary || detail?.clientNote ? (
                <section className="mt-5 rounded-2xl border border-border bg-card p-4">
                  <dl className="space-y-4">
                    <DetailField label={t('messages.deal.scopeSummary')} value={detail.scopeSummary} />
                    <DetailField label={t('messages.deal.clientNote')} value={detail.clientNote} />
                  </dl>
                </section>
              ) : null}

              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-foreground">{t('messages.deal.deliveryPlan')}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t('messages.deal.deliveryPlanHint')}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{milestones.length}</span>
                </div>

                {detail === undefined ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-10 text-sm text-muted-foreground">
                    <Loader2 size={17} className="animate-spin" />
                    {t('messages.deal.loadingDetails')}
                  </div>
                ) : milestones.length ? (
                  <div className="space-y-3">
                    {milestones.map((milestone, index) => (
                      <MilestoneDetail
                        key={milestone.id || index}
                        milestone={milestone}
                        index={index}
                        untitledLabel={t('messages.deal.untitledMilestone')}
                        labels={labels}
                        language={language}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
                    <Layers3 className="mx-auto text-muted-foreground" size={24} />
                    <p className="mt-2 text-sm font-semibold text-foreground">{t('messages.deal.noMilestones')}</p>
                  </div>
                )}
              </section>
            </div>

            <footer className="border-t border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
              {canTakeAction ? (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      closeModal();
                      void onDecline(offerId);
                    }}
                    className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('messages.deal.decline')}
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      closeModal();
                      void onAccept(offerId, displayAmount);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-none bg-[var(--gb-cyan)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionBusy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {t('messages.deal.accept')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {!canNegotiate && isLatestOffer
                      ? t('messages.deal.negotiationClosed')
                      : isLatestOffer && status === 'pending_freelancer'
                        ? t('messages.deal.awaitingPartner')
                        : statusLabel}
                  </p>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-border bg-muted/50 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
                  >
                    {t('messages.deal.close')}
                  </button>
                </div>
              )}
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
