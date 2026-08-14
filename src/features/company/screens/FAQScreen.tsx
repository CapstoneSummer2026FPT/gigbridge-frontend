import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  Search,
  Sparkles,
  Wallet,
  FileText,
  Briefcase,
  ShieldCheck,
  Zap,
  MessageSquare,
  BookOpen,
  Mail,
  X,
  ThumbsUp,
  ThumbsDown,
  Check,
  Share2,
  Tag,
} from 'lucide-react';
import { faqAPI } from '../../../api/faqAPI';
import type { FAQCategoryDto, FAQDto } from '../../../types/models/FAQ';

// Default Fallback Categories for rich offline/demo experience
const DEFAULT_CATEGORIES: FAQCategoryDto[] = [
  { id: 101, name: 'Thanh toán & G-coin', slug: 'payments-gcoin', sortOrder: 1, faqCount: 4, createdAt: '2026-01-01T00:00:00Z' },
  { id: 102, name: 'Quy trình tuyển dụng', slug: 'hiring-process', sortOrder: 2, faqCount: 4, createdAt: '2026-01-01T00:00:00Z' },
  { id: 103, name: 'Hợp đồng & Milestone', slug: 'contracts-milestones', sortOrder: 3, faqCount: 3, createdAt: '2026-01-01T00:00:00Z' },
  { id: 104, name: 'Trợ lý AI & Phỏng vấn', slug: 'ai-tools', sortOrder: 4, faqCount: 3, createdAt: '2026-01-01T00:00:00Z' },
  { id: 105, name: 'Tài khoản & Bảo mật', slug: 'account-security', sortOrder: 5, faqCount: 3, createdAt: '2026-01-01T00:00:00Z' },
];

// Default Fallback FAQs if backend is empty
const DEFAULT_FAQS: FAQDto[] = [
  {
    id: 1,
    faqCategoryId: 101,
    faqCategoryName: 'Thanh toán & G-coin',
    question: 'G-coin là gì? Tỷ lệ quy đổi G-coin sang VNĐ như thế nào?',
    answer:
      'G-coin là đơn vị tiền tệ chính thức trên nền tảng GigBridge dùng để thanh toán các gói dịch vụ, tạo hợp đồng Milestone và nạp/rút tiền. Tỷ lệ quy đổi cố định: 1 G-coin = 1.000 VNĐ. Bạn có thể nạp G-coin dễ dàng qua cổng thanh toán VNPay hoặc Chuyển khoản ngân hàng.',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    faqCategoryId: 101,
    faqCategoryName: 'Thanh toán & G-coin',
    question: 'Tiền đặt cọc Milestone có được bảo vệ an toàn không?',
    answer:
      'Tất cả số tiền đặt cọc cho các cột mốc (Milestone) sẽ được tạm giữ an toàn trong hệ thống Ký quỹ (Escrow) của GigBridge. Số tiền này chỉ được giải ngân cho Freelancer sau khi Khách hàng kiểm tra và nghiệm thu công việc thành công.',
    sortOrder: 2,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    faqCategoryId: 101,
    faqCategoryName: 'Thanh toán & G-coin',
    question: 'Làm thế nào để rút tiền từ số dư GigBridge về ngân hàng cá nhân?',
    answer:
      'Bạn có thể truy cập mục Quản lý Ví -> Rút tiền, nhập số lượng G-coin muốn rút và thông tin tài khoản ngân hàng chính chủ. Yêu cầu rút tiền thường được xử lý tự động trong vòng 5 - 15 phút.',
    sortOrder: 3,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    faqCategoryId: 102,
    faqCategoryName: 'Quy trình tuyển dụng',
    question: 'Làm sao để tạo một bài đăng tuyển dụng chuẩn thu hút Freelancer giỏi?',
    answer:
      'Bạn nên cung cấp tiêu đề công việc rõ ràng, chọn đúng Ngành & Danh mục, đặt mức ngân sách hợp lý (G-coin) và mô tả đầy đủ các yêu cầu đầu ra. Bạn cũng có thể sử dụng công cụ AI Job Post Generator của GigBridge để tự động khởi tạo mô tả chi tiết chỉ trong 5 giây.',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 5,
    faqCategoryId: 102,
    faqCategoryName: 'Quy trình tuyển dụng',
    question: 'Tôi có thể sửa hoặc hủy bài đăng tuyển dụng sau khi đã phát hành không?',
    answer:
      'Có. Bạn có thể chỉnh sửa lại các thông tin của bài đăng ở trạng thái Nháp (Draft) hoặc Đang mở (Open). Nếu muốn ngưng tuyển dụng, bạn chỉ cần bấm nút "Đóng Tin" hoặc "Hủy Tin" trong trang Quản lý công việc (/jobs/my-jobs).',
    sortOrder: 2,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 6,
    faqCategoryId: 103,
    faqCategoryName: 'Hợp đồng & Milestone',
    question: 'Quy trình giải quyết tranh chấp (Dispute resolution) diễn ra như thế nào?',
    answer:
      'Khi xảy ra bất đồng ý kiến về chất lượng bàn giao giữa Khách hàng và Freelancer, một trong hai bên có thể yêu cầu Mở Tranh Chấp. Ban quản trị GigBridge sẽ trực tiếp tham gia kiểm tra lịch sử trao đổi, file nghiệm thu và đưa ra phán quyết công bằng theo đúng hợp đồng cam kết.',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 7,
    faqCategoryId: 104,
    faqCategoryName: 'Trợ lý AI & Phỏng vấn',
    question: 'Tính năng Phỏng vấn AI (AI Screener) hoạt động như thế nào?',
    answer:
      'AI Screener của GigBridge tự động đóng vai trò là nhà tuyển dụng ảo, phỏng vấn ứng viên bằng các câu hỏi chuyên môn được cá nhân hóa, sau đó chấm điểm và phân tích năng lực chi tiết giúp bạn chọn ra ứng viên xuất sắc nhất.',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 8,
    faqCategoryId: 105,
    faqCategoryName: 'Tài khoản & Bảo mật',
    question: 'Làm thế nào để xác minh tài khoản danh tính (KYC)?',
    answer:
      'Truy cập Cài đặt tài khoản -> Xác minh danh tính. Tải lên ảnh chụp CCCD/Hộ chiếu hợp lệ và thực hiện quét khuôn mặt. Hệ thống AI KYC sẽ tự động duyệt hồ sơ trong vòng vài phút.',
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const HOT_KEYWORDS = ['G-coin', 'Thanh toán', 'Hợp đồng', 'Phỏng vấn AI', 'Hủy tin', 'Ký quỹ Escrow', 'Rút tiền'];

export default function FAQScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();
  const { i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const [categories, setCategories] = useState<FAQCategoryDto[]>([]);
  const [faqs, setFaqs] = useState<FAQDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<number, 'liked' | 'disliked'>>({});

  useEffect(() => {
    let isMounted = true;

    const loadFAQs = async () => {
      setIsLoading(true);

      try {
        const [categoriesResponse, faqsResponse] = await Promise.all([
          faqAPI.getCategories(),
          faqAPI.getFAQs(),
        ]);

        if (!isMounted) return;

        if (categoriesResponse.success && categoriesResponse.data && categoriesResponse.data.length > 0) {
          setCategories(categoriesResponse.data);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }

        if (faqsResponse.success && faqsResponse.data && faqsResponse.data.length > 0) {
          setFaqs(faqsResponse.data);
        } else {
          setFaqs(DEFAULT_FAQS);
        }
      } catch (e) {
        if (isMounted) {
          setCategories(DEFAULT_CATEGORIES);
          setFaqs(DEFAULT_FAQS);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadFAQs();

    return () => {
      isMounted = false;
    };
  }, []);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return sortA - sortB || a.name.localeCompare(b.name);
      }),
    [categories]
  );

  const filteredFAQs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return faqs.filter(faq => {
      const matchesCategory = selectedCategoryId === 'all' || faq.faqCategoryId === selectedCategoryId;
      const matchesSearch =
        !query ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [faqs, searchQuery, selectedCategoryId]);

  const groupedFAQs = useMemo(() => {
    return filteredFAQs.reduce((acc, faq) => {
      const categoryName =
        orderedCategories.find(category => category.id === faq.faqCategoryId)?.name ||
        faq.faqCategoryName ||
        (isVi ? 'Câu hỏi chung' : 'General Questions');

      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }

      acc[categoryName].push(faq);
      return acc;
    }, {} as Record<string, FAQDto[]>);
  }, [filteredFAQs, orderedCategories, isVi]);

  const toggleItem = (id: number) => {
    setExpandedItems(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyShareLink = (id: number) => {
    const url = `${window.location.origin}/faq#question-${id}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: number, type: 'liked' | 'disliked') => {
    setFeedbackState(prev => ({
      ...prev,
      [id]: prev[id] === type ? (undefined as any) : type,
    }));
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('thanh toán') || name.includes('payment') || name.includes('coin')) return <Wallet size={16} />;
    if (name.includes('hợp đồng') || name.includes('contract')) return <FileText size={16} />;
    if (name.includes('tuyển dụng') || name.includes('hiring') || name.includes('job')) return <Briefcase size={16} />;
    if (name.includes('ai') || name.includes('phỏng vấn')) return <Sparkles size={16} />;
    if (name.includes('bảo mật') || name.includes('tài khoản')) return <ShieldCheck size={16} />;
    return <HelpCircle size={16} />;
  };

  return (
    <GuestLayout>
      <div className="min-h-screen pb-20 pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              saveScrollPosition();
              navigate('/');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-border/80 bg-card/80 hover:bg-muted/60 text-foreground text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{isVi ? 'Quay lại trang chủ' : 'Back to Home'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Sparkles size={14} className="text-[var(--brand)] animate-pulse" />
            <span>{isVi ? 'Trung tâm trợ giúp 24/7' : '24/7 Help Center'}</span>
          </div>
        </div>

        {/* Hero Section Banner with Glassmorphism */}
        <div className="relative rounded-3xl border border-border/80 bg-gradient-to-br from-[var(--brand)]/10 via-card to-amber-500/5 p-8 sm:p-12 shadow-2xl overflow-hidden text-center space-y-6">
          {/* Top Decorative Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--brand)] via-indigo-500 to-amber-500" />

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand)] text-xs font-black uppercase tracking-widest mx-auto">
            <HelpCircle size={14} />
            <span>{isVi ? 'CÂU HỎI THƯỜNG GẶP (FAQ)' : 'FREQUENTLY ASKED QUESTIONS'}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight max-w-3xl mx-auto leading-tight">
            {isVi ? (
              <>
                Chúng tôi có thể <span className="font-serif italic font-normal text-[var(--brand)]">giúp gì</span> cho bạn?
              </>
            ) : (
              <>
                How can we <span className="font-serif italic font-normal text-[var(--brand)]">help you</span> today?
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto font-medium">
            {isVi
              ? 'Tìm kiếm nhanh các câu trả lời về quy trình nạp/rút G-coin, đăng tin tuyển dụng, hợp đồng Milestone và công cụ phỏng vấn AI.'
              : 'Quickly find answers about G-coin payments, job postings, milestone contracts, and AI interview tools.'}
          </p>

          {/* Main Glass Search Input */}
          <div className="max-w-2xl mx-auto relative mt-4">
            <div className="relative flex items-center">
              <Search size={20} className="absolute left-4 text-[var(--brand)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isVi ? 'Nhập từ khóa tìm kiếm (ví dụ: G-coin, rút tiền, hủy tin)...' : 'Search for questions, keywords, or topics...'}
                className="w-full py-4 pl-12 pr-12 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl text-foreground text-sm font-semibold shadow-lg focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Hot Keywords Row */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              <span className="font-bold text-muted-foreground flex items-center gap-1">
                <Zap size={13} className="text-amber-500" />
                {isVi ? 'Từ khóa hot:' : 'Hot topics:'}
              </span>
              {HOT_KEYWORDS.map(kw => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setSearchQuery(kw)}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    searchQuery === kw
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-md'
                      : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:border-[var(--brand)]/40'
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal Category Navigation Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag size={13} className="text-[var(--brand)]" />
              {isVi ? 'Danh mục chủ đề' : 'Browse Categories'}
            </h3>
            <span className="text-xs font-extrabold text-[var(--brand)]">
              {filteredFAQs.length} {isVi ? 'câu hỏi tìm thấy' : 'questions found'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                selectedCategoryId === 'all'
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-lg shadow-[var(--brand)]/20'
                  : 'bg-card/80 border-border/70 text-foreground hover:bg-muted/50'
              }`}
            >
              <HelpCircle size={15} />
              <span>{isVi ? 'Tất cả chủ đề' : 'All Categories'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${selectedCategoryId === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                {faqs.length}
              </span>
            </button>

            {orderedCategories.map(cat => {
              const catFaqCount = faqs.filter(f => f.faqCategoryId === cat.id).length || cat.faqCount || 0;
              const isSelected = selectedCategoryId === cat.id;
              const catIcon = getCategoryIcon(cat.name);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-lg shadow-[var(--brand)]/20'
                      : 'bg-card/80 border-border/70 text-foreground hover:bg-muted/50'
                  }`}
                >
                  {catIcon}
                  <span>{cat.name}</span>
                  {catFaqCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {catFaqCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section: Loading, Error, or FAQs List */}
        {isLoading ? (
          <div className="rounded-3xl border border-border/80 bg-card/50 p-12 text-center space-y-3 shadow-xl">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mx-auto animate-spin">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-bold text-foreground">
              {isVi ? 'Đang tải danh sách câu hỏi thường gặp...' : 'Loading FAQs...'}
            </p>
          </div>
        ) : Object.keys(groupedFAQs).length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-border/80 bg-card/60 p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto border border-border/80">
              <HelpCircle size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-foreground">
                {isVi ? 'Không tìm thấy câu hỏi phù hợp' : 'No matching questions found'}
              </h3>
              <p className="text-xs text-muted-foreground font-medium max-w-md mx-auto">
                {isVi
                  ? 'Thử tìm kiếm với từ khóa khác hoặc bấm nút bên dưới để chọn tất cả danh mục.'
                  : 'Try searching with different keywords or reset your active filters.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--brand)] text-white text-xs font-black shadow-md hover:bg-[var(--brand)]/90 transition-all cursor-pointer"
            >
              {isVi ? 'Xem tất cả câu hỏi' : 'Reset search & filters'}
            </button>
          </div>
        ) : (
          /* FAQ Accordion List grouped by Category */
          <div className="space-y-8">
            {Object.entries(groupedFAQs).map(([categoryName, questions]) => (
              <div key={categoryName} className="space-y-3.5">
                <div className="flex items-center gap-2.5 pb-1 border-b border-border/50">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center font-bold">
                    {getCategoryIcon(categoryName)}
                  </div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">
                    {categoryName}
                  </h2>
                  <span className="text-xs font-extrabold text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-full border border-border/60">
                    {questions.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {questions.map(faq => {
                    const isExpanded = expandedItems.has(faq.id);
                    const userFeedback = feedbackState[faq.id];

                    return (
                      <div
                        id={`question-${faq.id}`}
                        key={faq.id}
                        className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                          isExpanded
                            ? 'border-[var(--brand)]/50 bg-card/95 shadow-xl ring-1 ring-[var(--brand)]/20'
                            : 'border-border/80 bg-card/80 hover:border-border hover:bg-card shadow-xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleItem(faq.id)}
                          className="w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer"
                        >
                          <div className="space-y-1 pr-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand)] flex items-center gap-1">
                              <HelpCircle size={12} />
                              {faq.faqCategoryName || categoryName}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-foreground leading-snug">
                              {faq.question}
                            </h3>
                          </div>

                          <div className={`p-2 rounded-xl border transition-all shrink-0 mt-0.5 ${
                            isExpanded ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-muted/40 border-border text-muted-foreground'
                          }`}>
                            <ChevronDown
                              size={18}
                              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        {/* Expanded Answer Content */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-border/40 space-y-4 animate-in fade-in duration-200">
                            <div className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed whitespace-pre-line bg-muted/20 p-4 rounded-2xl border border-border/50">
                              {faq.answer}
                            </div>

                            {/* Answer Footer Bar: Feedback & Share */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="font-bold text-[11px]">
                                  {isVi ? 'Câu trả lời có hữu ích không?' : 'Was this answer helpful?'}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(faq.id, 'liked')}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                                      userFeedback === 'liked'
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    <ThumbsUp size={13} />
                                    <span>{userFeedback === 'liked' ? (isVi ? 'Đã thích' : 'Yes') : (isVi ? 'Có' : 'Yes')}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFeedback(faq.id, 'disliked')}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                                      userFeedback === 'disliked'
                                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                                        : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    <ThumbsDown size={13} />
                                    <span>{userFeedback === 'disliked' ? (isVi ? 'Chưa thích' : 'No') : (isVi ? 'Không' : 'No')}</span>
                                  </button>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopyShareLink(faq.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted hover:bg-border/60 text-text-primary text-[11px] font-bold transition-all cursor-pointer ml-auto"
                              >
                                {copiedId === faq.id ? (
                                  <>
                                    <Check size={13} className="text-emerald-500" />
                                    <span className="text-emerald-500">{isVi ? 'Đã sao chép link' : 'Copied!'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 size={13} />
                                    <span>{isVi ? 'Chia sẻ link' : 'Share link'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Support Hero Card */}
        <div className="rounded-3xl border border-[color-mix(in_srgb,var(--brand)_30%,transparent)] bg-gradient-to-br from-[var(--brand)]/10 via-card to-amber-500/5 p-8 sm:p-10 shadow-2xl space-y-6 text-center sm:text-left relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-xs font-black uppercase tracking-wider">
                <MessageSquare size={13} />
                <span>{isVi ? 'Hỗ trợ trực tiếp' : 'Direct Assistance'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {isVi ? 'Vẫn chưa tìm thấy câu trả lời?' : 'Still need help finding answers?'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {isVi
                  ? 'Đội ngũ chăm sóc khách hàng GigBridge sẵn sàng hỗ trợ trực tiếp 24/7 để giải quyết mọi thắc mắc của bạn.'
                  : 'Our dedicated support team is available 24/7 to assist you with any questions or issues.'}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[var(--brand)] text-white text-xs font-black shadow-lg hover:shadow-[var(--brand)]/25 hover:bg-[var(--brand)]/90 transition-all cursor-pointer"
              >
                <Mail size={16} />
                <span>{isVi ? 'Liên hệ hỗ trợ' : 'Contact Support'}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/guide')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold transition-all cursor-pointer"
              >
                <BookOpen size={16} />
                <span>{isVi ? 'Xem hướng dẫn sử dụng' : 'User Guide'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
