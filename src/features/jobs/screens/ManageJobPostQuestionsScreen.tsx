import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Check, ChevronDown, ChevronUp, FileQuestion, HelpCircle, LoaderCircle, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';
import { AppLayout } from '../../../shared/components/AppLayout';
import { jobAPI } from '../../../api/jobAPI';
import type { JobPostQuestionDto } from '../../../types/models/Job';
import '../styles/PostJobScreen.css';
import { useTranslation } from '../../../hooks/useTranslation';
import { QuestionRequiredToggle } from '../components/QuestionRequiredToggle';
import { useUndoableDeleteScope, useUndoableListDelete } from '../../../shared/hooks/useUndoableDeleteScope';

type QuestionDraft = JobPostQuestionDto & {
  isNew?: boolean;
};

const orderQuestions = (questions: JobPostQuestionDto[]) =>
  [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

const toDraft = (question: JobPostQuestionDto): QuestionDraft => ({
  ...question,
  isRequired: question.isRequired ?? true,
});

const isDraftRuleFailure = (message?: string) =>
  (message || '').toLowerCase().includes('questions can only be modified');

export default function ManageJobPostQuestionsScreen() {
  const { t } = useTranslation();
  const { jobPostId = '' } = useParams();
  const undoDeleteController = useUndoableDeleteScope();
  const undoableListDelete = useUndoableListDelete(undoDeleteController);
  const DRAFT_RULE_MESSAGE = t('manageQuestions.draftRuleMessage', 'Chỉ bài đăng dạng bản nháp mới có thể cập nhật câu hỏi.');
  const navigate = useNavigate();
  const [originalQuestions, setOriginalQuestions] = useState<JobPostQuestionDto[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<QuestionDraft[]>([]);
  const currentQuestionsRef = useRef<QuestionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = async () => {
    if (!jobPostId) return;

    setIsLoading(true);
    setError(null);

    const response = await jobAPI.getJobPostQuestions(jobPostId);

    if (!response.success || !response.data) {
      setError(response.message || t('manageQuestions.unableToLoad', 'Không thể tải danh sách câu hỏi.'));
      setIsLoading(false);
      return;
    }

    const ordered = orderQuestions(response.data);
    setOriginalQuestions(ordered);
    const drafts = ordered.map(toDraft);
    currentQuestionsRef.current = drafts;
    setCurrentQuestions(drafts);
    setIsLoading(false);
  };

  useEffect(() => {
    loadQuestions();
  }, [jobPostId]);

  useEffect(() => {
    currentQuestionsRef.current = currentQuestions;
  }, [currentQuestions]);

  const changedExistingQuestions = useMemo(() => {
    const originalById = new Map(originalQuestions.map(question => [question.jobPostQuestionsId, question]));

    return currentQuestions.filter(question => {
      if (question.isNew) return false;

      const original = originalById.get(question.jobPostQuestionsId);
      if (!original) return false;

      return (
        original.questionText !== question.questionText ||
        original.orderIndex !== question.orderIndex ||
        original.isRequired !== question.isRequired
      );
    });
  }, [currentQuestions, originalQuestions]);

  const updateQuestion = (questionId: string, patch: Partial<QuestionDraft>) => {
    setCurrentQuestions(prev =>
      prev.map(question =>
        question.jobPostQuestionsId === questionId ? { ...question, ...patch } : question
      )
    );
  };

  const normalizeDraftOrder = (questions: QuestionDraft[]) =>
    questions.map((question, index) => ({ ...question, orderIndex: index }));

  const handleAddQuestion = () => {
    const id = `new-${Date.now()}`;
    setCurrentQuestions(prev =>
      normalizeDraftOrder([
        ...prev,
        {
          jobPostQuestionsId: id,
          jobPostsId: jobPostId,
          questionText: '',
          orderIndex: prev.length,
          isRequired: true,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          isNew: true,
        },
      ])
    );
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentQuestions.length) return;

    setCurrentQuestions(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return normalizeDraftOrder(next);
    });
  };

  const handleDeleteQuestion = (question: QuestionDraft): void => {
    const index = currentQuestionsRef.current.findIndex(
      item => item.jobPostQuestionsId === question.jobPostQuestionsId,
    );
    if (index < 0) return;

    undoableListDelete.scheduleDelete({
      collectionKey: `manage-job-questions:${jobPostId}`,
      index,
      getItems: () => currentQuestionsRef.current,
      setItems: nextQuestions => {
        const normalizedQuestions = normalizeDraftOrder(nextQuestions);
        currentQuestionsRef.current = normalizedQuestions;
        setCurrentQuestions(normalizedQuestions);
      },
      getItemKey: item => item.jobPostQuestionsId,
      normalize: normalizeDraftOrder,
      message: t('undoDelete.questionDeleted', {
        name: question.questionText.trim() || t('undoDelete.untitledQuestion'),
      }),
      undoLabel: t('undoDelete.action'),
      commit: question.isNew ? undefined : async () => {
        const response = await jobAPI.deleteJobPostQuestion(jobPostId, question.jobPostQuestionsId);
        if (!response.success) {
          throw new Error(isDraftRuleFailure(response.message)
            ? DRAFT_RULE_MESSAGE
            : response.message || t('manageQuestions.unableToDelete', 'Không thể xóa câu hỏi.'));
        }
        setOriginalQuestions(current => current.filter(
          item => item.jobPostQuestionsId !== question.jobPostQuestionsId,
        ));
      },
      onCommitError: error => {
        toast.error(error instanceof Error
          ? error.message
          : t('manageQuestions.unableToDelete', 'Không thể xóa câu hỏi.'));
      },
    });
  };

  const validateQuestion = (question: QuestionDraft) => {
    if (!question.questionText.trim()) return t('manageQuestions.textRequired', 'Nội dung câu hỏi không được để trống.');
    if (question.questionText.length > 1000) return t('manageQuestions.textMaxLength', 'Nội dung câu hỏi không vượt quá 1000 ký tự.');
    if (question.orderIndex < 0) return t('manageQuestions.invalidOrder', 'Thứ tự không hợp lệ.');
    return null;
  };

  const handleSave = async () => {
    const deletesCommitted = await undoDeleteController.finalizeAll();
    if (!deletesCommitted) return;

    const ordered = normalizeDraftOrder(currentQuestions);
    const validationError = ordered.map(validateQuestion).find(Boolean);
    if (validationError) {
      showValidationToast(validationError, { fallback: t('validation.invalidFormat') });
      return;
    }

    setIsSaving(true);

    const newQuestions = ordered.filter(question => question.isNew);
    for (const question of newQuestions) {
      const response = await jobAPI.createJobPostQuestion(jobPostId, {
        questionText: question.questionText.trim(),
        orderIndex: question.orderIndex,
        isRequired: question.isRequired,
      });

      if (!response.success) {
        setIsSaving(false);
        const fallback = isDraftRuleFailure(response.message) ? DRAFT_RULE_MESSAGE : response.message || t('manageQuestions.unableToUpdateRequired');
        if (isValidationResponse(response) || isDraftRuleFailure(response.message)) showValidationToast(response, { fallback });
        else toast.error(fallback);
        return;
      }
    }

    const changed = changedExistingQuestions.map(question => ({
      jobPostQuestionsId: question.jobPostQuestionsId,
      questionText: question.questionText.trim(),
      orderIndex: question.orderIndex,
      isRequired: question.isRequired,
    }));

    if (changed.length > 0) {
      const response = await jobAPI.updateBulkJobPostQuestions(jobPostId, { questions: changed });
      if (!response.success) {
        setIsSaving(false);
        const fallback = isDraftRuleFailure(response.message) ? DRAFT_RULE_MESSAGE : response.message || t('manageQuestions.bulkUpdateFailed');
        if (isValidationResponse(response) || isDraftRuleFailure(response.message)) showValidationToast(response, { fallback });
        else toast.error(fallback);
        return;
      }
    }

    if (newQuestions.length === 0 && changed.length === 0) {
      toast.info(t('manageQuestions.noChanges', 'Chưa có thay đổi nào để lưu.'));
      setIsSaving(false);
      return;
    }

    toast.success(t('manageQuestions.savedSuccess', 'Đã lưu danh sách câu hỏi thành công!'));
    await loadQuestions();
    setIsSaving(false);
  };

  const requiredCount = currentQuestions.filter(q => q.isRequired).length;
  const optionalCount = currentQuestions.length - requiredCount;

  const handleBackToJobs = async (): Promise<void> => {
    const deletesCommitted = await undoDeleteController.finalizeAll();
    if (deletesCommitted) navigate('/jobs/my-jobs');
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* HERO BANNER CARD */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-[var(--brand)]/10 via-purple-500/5 to-card p-6 sm:p-8 shadow-sm">
          <button
            type="button"
            onClick={() => void handleBackToJobs()}
            className="mb-4 inline-flex items-center gap-2 text-xs font-black text-[var(--brand)] hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"
          >
            <ArrowLeft size={15} /> {t('manageQuestions.backToMyJobs', 'Quay lại danh sách dự án')}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/15 border border-[var(--brand)]/30 text-[11px] font-black tracking-widest text-[var(--brand)] uppercase">
                <Sparkles size={13} />
                {t('manageQuestions.eyebrow', 'Thiết lập Câu hỏi Phỏng vấn')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {t('manageQuestions.title', 'Quản lý Câu hỏi Phỏng vấn')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t('manageQuestions.subtitle', 'Thêm các câu hỏi tình huống hoặc chuyên môn để sàng lọc ứng viên nhanh chóng và chọn đúng freelancer phù hợp.')}
              </p>
            </div>

            {/* QUICK STATS CHIPS */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-background/80 backdrop-blur-md p-3.5 rounded-2xl border border-border/70 shadow-xs">
              <div className="px-3.5 py-2 rounded-xl bg-muted/60 text-center min-w-[70px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Tổng số</span>
                <strong className="text-base font-black text-foreground">{currentQuestions.length}</strong>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-muted/60 text-center min-w-[70px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Bắt buộc</span>
                <strong className="text-base font-black text-[var(--brand)]">{requiredCount}</strong>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-muted/60 text-center min-w-[70px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Tùy chọn</span>
                <strong className="text-base font-black text-muted-foreground">{optionalCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN STUDIO CONTAINER */}
        <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
            <div>
              <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                <FileQuestion size={20} className="text-[var(--brand)]" />
                {t('manageQuestions.sectionTitle', 'Danh sách câu hỏi phỏng vấn')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('manageQuestions.sectionHint', 'Đặt tối đa 1000 ký tự cho mỗi câu hỏi. Đặt thuộc tính Bắt buộc hoặc Tùy chọn.')}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--brand)]/30 bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-black hover:bg-[var(--brand)]/20 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={16} /> {t('manageQuestions.addQuestion', 'Thêm câu hỏi mới')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-black shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? t('manageQuestions.saving', 'Đang lưu...') : t('manageQuestions.saveChanges', 'Lưu thay đổi')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
              <LoaderCircle className="animate-spin text-[var(--brand)]" size={20} />
              {t('manageQuestions.loadingQuestions', 'Đang tải danh sách câu hỏi...')}
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 font-bold">
              {error}
            </div>
          ) : currentQuestions.length === 0 ? (
            <div className="text-center py-14 border-2 border-dashed border-border/80 rounded-3xl bg-muted/20 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mx-auto">
                <HelpCircle size={28} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-foreground">
                  {t('manageQuestions.noQuestionsTitle', 'Chưa có câu hỏi phỏng vấn nào')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('manageQuestions.noQuestionsDesc', 'Thêm các câu hỏi ngắn để giúp bạn đánh giá kinh nghiệm và năng lực freelancer nhanh hơn.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand)] text-white text-xs font-black shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                <Plus size={16} /> {t('manageQuestions.addFirstQuestion', 'Thêm câu hỏi đầu tiên')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {normalizeDraftOrder(currentQuestions).map((question, index) => (
                <div
                  key={question.jobPostQuestionsId}
                  className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-[var(--brand)]/50 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 px-3 items-center justify-center rounded-full bg-[var(--brand)] text-white text-xs font-black shadow-2xs">
                        {t('manageQuestions.questionNum', 'Câu {{num}}', { num: index + 1 })}
                      </span>
                      {question.isNew && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Mới
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <QuestionRequiredToggle
                        isRequired={question.isRequired}
                        questionNumber={index + 1}
                        onChange={isRequired => updateQuestion(question.jobPostQuestionsId, { isRequired, orderIndex: index })}
                      />

                      {/* REORDER BUTTONS */}
                      <div className="flex items-center gap-1 border-l border-border/60 pl-3">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveQuestion(index, 'up')}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--brand)] hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          title="Di chuyển lên"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={index === currentQuestions.length - 1}
                          onClick={() => handleMoveQuestion(index, 'down')}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--brand)] hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(question)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors ml-1"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <textarea
                    value={question.questionText}
                    onChange={event => updateQuestion(question.jobPostQuestionsId, { questionText: event.target.value, orderIndex: index })}
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-muted/20 focus:bg-background border border-border/80 rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-all resize-y"
                    placeholder={t('manageQuestions.placeholder', 'Nhập nội dung câu hỏi phỏng vấn... Ví dụ: Hãy chia sẻ 1-2 dự án tương tự bạn đã hoàn thành.')}
                  />

                  <div className="flex justify-between items-center text-[11px] text-muted-foreground font-semibold">
                    <span>Thứ tự hiển thị: #{index + 1}</span>
                    <span className={question.questionText.length > 900 ? 'text-amber-500 font-bold' : ''}>
                      {question.questionText.length} / 1000 ký tự
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BOTTOM ACTIONS BAR */}
          {!isLoading && !error && currentQuestions.length > 0 && (
            <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <Sparkles size={14} className="text-[var(--brand)]" />
                <span>Mẹo: 2-3 câu hỏi ngắn gọn sẽ thu hút những ứng viên chất lượng nhất.</span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand)] text-white text-xs font-black shadow-md hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                {isSaving ? t('manageQuestions.saving', 'Đang lưu...') : t('manageQuestions.saveQuestions', 'Lưu danh sách câu hỏi')}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
