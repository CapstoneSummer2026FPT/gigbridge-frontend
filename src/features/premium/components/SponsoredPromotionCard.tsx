import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { jobAPI } from '../../../api/jobAPI';
import type { PublicJobPromotionCardDto } from '../../../types/models/Job';
import { premiumAPI } from '../api/premiumAPI';
import type { PublicPromotionCard } from '../types';
import { PromotedJobCard } from './PromotedJobCard';
import { PromotionCard } from './PromotionCard';

type SponsoredPromotionCardProps = {
  promotionType?: 'job' | 'freelancer';
};

const getPromotionVisitorKey = (): string => {
  const storageKey = 'gigbridge_promotion_visitor';
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const value = globalThis.crypto?.randomUUID?.() ??
    `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(storageKey, value);
  return value;
};

export function SponsoredPromotionCard({ promotionType = 'job' }: SponsoredPromotionCardProps) {
  const navigate = useNavigate();
  const visitorKey = useRef(getPromotionVisitorKey());
  const [jobPromotions, setJobPromotions] = useState<PublicJobPromotionCardDto[]>([]);
  const [freelancerPromotions, setFreelancerPromotions] = useState<PublicPromotionCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setActiveIndex(0);
    if (promotionType === 'freelancer') {
      void premiumAPI.promotionFeed().then(response => {
        if (active) setFreelancerPromotions(response.data ?? []);
      });
    } else {
      void jobAPI.getJobPromotionFeed().then(response => {
        if (active) setJobPromotions(response.data ?? []);
      });
    }
    return () => { active = false; };
  }, [promotionType]);

  const promotions = promotionType === 'freelancer' ? freelancerPromotions : jobPromotions;
  useEffect(() => {
    if (promotions.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % promotions.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [promotions.length]);

  useEffect(() => {
    const promotion = promotions[activeIndex];
    if (!promotion) return;
    if (promotionType === 'freelancer') {
      void premiumAPI.trackPromotionImpression(promotion.id, visitorKey.current);
    } else {
      void jobAPI.trackJobPromotionImpression(promotion.id);
    }
  }, [activeIndex, promotionType, promotions]);

  const promotion = promotions[activeIndex];
  if (!promotion) return null;

  if (promotionType === 'freelancer') {
    const freelancer = promotion as PublicPromotionCard;
    return <section className="browse-promotion-section promotion-sticky-card">
      <h3>Featured talent</h3>
      <PromotionCard
        card={freelancer}
        carouselCount={promotions.length}
        carouselIndex={activeIndex}
        onSelectCarousel={setActiveIndex}
        onExplore={() => {
          void premiumAPI.trackPromotionClick(freelancer.id, visitorKey.current);
          navigate(`/profile/freelancer/${freelancer.freelancerUserId}`);
        }}
      />
    </section>;
  }

  const job = promotion as PublicJobPromotionCardDto;
  return <section className="browse-promotion-section promotion-sticky-card">
    <h3>Featured opportunities</h3>
    <PromotedJobCard
      card={job}
      carouselCount={promotions.length}
      carouselIndex={activeIndex}
      onSelectCarousel={setActiveIndex}
      onExplore={() => {
        void jobAPI.trackJobPromotionClick(job.id);
        navigate(`/jobs/${job.jobPostId}`);
      }}
    />
  </section>;
}
