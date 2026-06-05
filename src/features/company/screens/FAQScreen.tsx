import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { useScrollRestoration } from '../../../hooks/useScrollRestoration';
import { ArrowLeft, HelpCircle, ChevronDown, Search } from 'lucide-react';
import { faqAPI } from '../../../api/faqAPI';
import type { FAQCategoryDto, FAQDto } from '../../../types/models/FAQ';

export default function FAQScreen() {
  const navigate = useNavigate();
  const { saveScrollPosition } = useScrollRestoration();
  const [categories, setCategories] = useState<FAQCategoryDto[]>([]);
  const [faqs, setFaqs] = useState<FAQDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadFAQs = async () => {
      setIsLoading(true);
      setError(null);

      const [categoriesResponse, faqsResponse] = await Promise.all([
        faqAPI.getCategories(),
        faqAPI.getFAQs(),
      ]);

      if (!isMounted) return;

      if (!categoriesResponse.success || !faqsResponse.success) {
        setCategories([]);
        setFaqs([]);
        setError(categoriesResponse.message || faqsResponse.message || 'Unable to load FAQs');
        setIsLoading(false);
        return;
      }

      setCategories(categoriesResponse.data || []);
      setFaqs(faqsResponse.data || []);
      setIsLoading(false);
    };

    loadFAQs();

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

  const selectableCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return orderedCategories;

    return orderedCategories.filter(category =>
      category.name.toLowerCase().includes(query) ||
      category.slug.toLowerCase().includes(query)
    );
  }, [categorySearch, orderedCategories]);

  const groupedFAQs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const categoryOrder = new Map(orderedCategories.map((category, index) => [category.id, index]));

    const filtered = faqs
      .filter(faq => selectedCategoryId === 'all' || faq.faqCategoryId === selectedCategoryId)
      .filter(faq =>
        !query ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        const categoryDiff = (categoryOrder.get(a.faqCategoryId) ?? 9999) - (categoryOrder.get(b.faqCategoryId) ?? 9999);
        const sortDiff = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
        return categoryDiff || sortDiff || a.id - b.id;
      });

    return filtered.reduce((acc, faq) => {
      const categoryName =
        orderedCategories.find(category => category.id === faq.faqCategoryId)?.name ||
        faq.faqCategoryName ||
        'General';

      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }

      acc[categoryName].push(faq);
      return acc;
    }, {} as Record<string, FAQDto[]>);
  }, [faqs, orderedCategories, searchQuery, selectedCategoryId]);

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

  return (
    <GuestLayout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              saveScrollPosition();
              navigate('/');
            }}
            className="btn-ghost-cyan px-4 py-2 mb-8 text-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>

          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan to-purple">
                <HelpCircle size={24} className="text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black text-primary">Frequently Asked Questions</h1>
            </div>
            <p className="text-lg text-secondary max-w-2xl mx-auto">
              Find answers to common questions about GigBridge
            </p>
          </div>

          <div className="glass-card p-4 mb-8">
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search for answers..."
                  className="input-gb w-full py-3 text-sm pl-10"
                />
              </div>
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="input-gb w-full py-3 text-sm"
              >
                <option value="all">All categories</option>
                {orderedCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="relative mt-3">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="input-gb w-full py-3 text-sm pl-10"
              />
            </div>

            {categorySearch.trim() && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectableCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`badge-cyan text-xs ${selectedCategoryId === category.id ? '' : 'opacity-70'}`}
                  >
                    {category.name}
                  </button>
                ))}
                {selectableCategories.length === 0 && (
                  <span className="text-sm text-secondary">No matching categories</span>
                )}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="glass-card p-12 text-center">
              <p className="text-primary font-semibold">Loading FAQs...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="glass-card p-12 text-center">
              <HelpCircle size={48} className="text-muted mx-auto mb-4" />
              <p className="text-primary font-semibold mb-2">Unable to load FAQs</p>
              <p className="text-sm text-secondary">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="space-y-8">
              {Object.entries(groupedFAQs).map(([category, questions]) => (
                <div key={category}>
                  <h2 className="text-xl font-bold text-primary mb-4">{category}</h2>
                  <div className="space-y-3">
                    {questions.map(faq => {
                      const isExpanded = expandedItems.has(faq.id);

                      return (
                        <div key={faq.id} className="glass-card overflow-hidden">
                          <button
                            onClick={() => toggleItem(faq.id)}
                            className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                          >
                            <span className="text-sm font-semibold text-primary">{faq.question}</span>
                            <ChevronDown
                              size={20}
                              className={`text-cyan flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-white/5">
                              <p className="text-sm text-secondary leading-relaxed">{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(groupedFAQs).length === 0 && (
                <div className="glass-card p-12 text-center">
                  <HelpCircle size={48} className="text-muted mx-auto mb-4" />
                  <p className="text-primary font-semibold mb-2">No results found</p>
                  <p className="text-sm text-secondary">Try searching with different keywords or categories</p>
                </div>
              )}
            </div>
          )}

          <div className="glass-card p-8 mt-12 text-center">
            <h3 className="text-xl font-bold text-primary mb-3">Still need help?</h3>
            <p className="text-secondary mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="btn-cyan px-6 py-3">
                Contact Support
              </button>
              <button
                onClick={() => navigate('/guide')}
                className="btn-ghost-cyan px-6 py-3"
              >
                View User Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
