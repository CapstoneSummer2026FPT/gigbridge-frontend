import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Layers } from 'lucide-react';
import DriftWall, { DriftWallItem } from './DriftWall';
import { apiService } from '../../../service/apiService';

interface CategoryDto {
  categoryId?: string;
  id?: string;
  name: string;
  name_vi?: string;
  slug?: string;
  description?: string | null;
}

export default function CategoriesSection() {
  const { t } = useTranslation('common');
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await apiService.get<CategoryDto[]>('Categories');
        if (response.success && response.data && isMounted) {
          setCategories(response.data);
        }
      } catch (err) {
        console.warn('CategoriesSection: Error fetching GET /api/Categories', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const items: DriftWallItem[] = useMemo(() => {
    return categories.map((cat) => ({
      title: cat.name_vi || cat.name,
      href: '/auth/signup',
    }));
  }, [categories]);

  return (
    <section id="categories-wall" className="relative w-full py-20 overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-5 md:px-10 flex flex-col items-center">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="border-hsla flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-general uppercase tracking-widest text-foreground shadow-sm">
            <Sparkles className="size-3.5 text-primary" />
            <span className="font-semibold">{t('landing.categoriesWall.badge')}</span>
          </div>

          <h2
            className="mt-5 font-zentry text-3xl font-black uppercase tracking-wide text-foreground md:text-6xl text-center"
            dangerouslySetInnerHTML={{ __html: t('landing.categoriesWall.animatedTitle') }}
          />

          <p className="mt-4 max-w-xl font-circular-web text-base text-muted-foreground">
            {t('landing.categoriesWall.subtitle')}
          </p>
        </div>
      </div>

      {/* 3D Drifting Wall of System Categories */}
      <div className="relative w-full h-[380px] sm:h-[440px] md:h-[500px] border-y border-border/40 bg-secondary/10">
        {!loading && items.length > 0 ? (
          <DriftWall
            items={items}
            columns={isMobile ? 2 : 5}
            tileWidth={isMobile ? 140 : 230}
            tileHeight={isMobile ? 48 : 64}
            gap={isMobile ? 10 : 16}
            radius={14}
            tilt={isMobile ? 8 : 14}
            turn={isMobile ? -6 : -12}
            depth={isMobile ? 50 : 90}
            speed={35}
            pauseOnHover={false}
            fade={0.5}
            dim={0.85}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Bottom Pill Indicator */}
        {!loading && categories.length > 0 && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-md px-6 py-2 text-xs font-general uppercase tracking-wider text-foreground border border-border shadow-xl">
              <Layers className="size-3.5 text-primary animate-pulse" />
              <span className="font-bold">{categories.length} {t('landing.categoriesWall.badge')}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
