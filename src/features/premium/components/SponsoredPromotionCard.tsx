import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../../hooks/useTranslation';
import { premiumAPI } from '../api';
import type { PublicPromotionCard } from '../types';
import { PromotionCard } from './PromotionCard';

const VISITOR_STORAGE_KEY = 'gigbridge_promotion_visitor';
const getVisitorKey = () => {
  const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID(); localStorage.setItem(VISITOR_STORAGE_KEY, created); return created;
};

export function SponsoredPromotionCard() {
  const { t } = useTranslation(); const navigate = useNavigate();
  const [promotions, setPromotions] = useState<PublicPromotionCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    let active = true;
    void premiumAPI.promotionFeed().then(response => {
      if (!active || !response.data?.length) return;
      setPromotions(response.data);
    });
    return () => { active = false; };
  }, []);
  const promotion = promotions[activeIndex];
  useEffect(() => {
    if (promotion) void premiumAPI.trackPromotionImpression(promotion.id, getVisitorKey());
  }, [promotion]);
  if (!promotion) return null;
  return <section className="browse-promotion-section"><h3>{t('premiumPromotion.browseSectionTitle')}</h3><PromotionCard
    card={promotion} carouselCount={promotions.length} carouselIndex={activeIndex}
    onSelectCarousel={setActiveIndex} onExplore={() => {
    void premiumAPI.trackPromotionClick(promotion.id, getVisitorKey());
    navigate(`/profile/freelancer/${promotion.freelancerUserId}`);
  }} /></section>;
}
