import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '../../../hooks/useTranslation';
import type { DeliveryChangeKind, DeliveryRemoteChange } from '../utils/deliveryChanges';

const TOAST_ID = 'delivery-space-remote-change';

const COPY: Record<DeliveryChangeKind, { key: string; fallback: string }> = {
  submitted: {
    key: 'contracts.deliverySpace.liveSubmitted',
    fallback: 'Freelancer vừa nộp {{count}} hạng mục để bạn duyệt.',
  },
  approved: {
    key: 'contracts.deliverySpace.liveApproved',
    fallback: 'Khách hàng đã duyệt {{count}} hạng mục.',
  },
  revisionRequired: {
    key: 'contracts.deliverySpace.liveRevisionRequired',
    fallback: 'Khách hàng yêu cầu chỉnh sửa {{count}} hạng mục.',
  },
  updated: {
    key: 'contracts.deliverySpace.liveUpdated',
    fallback: 'Khu vực giao nhận vừa được cập nhật.',
  },
};

/**
 * Announces what the other party just did.
 *
 * The list updating underneath someone is easy to miss — especially in the modal, where the change
 * can be to a work item that is not the one currently open. One toast per observed change, keyed so
 * a burst of frames for the same action collapses into a single line rather than a stack.
 */
export const useDeliveryChangeToast = (change: DeliveryRemoteChange | null): void => {
  const { t } = useTranslation(['contracts']);
  const announcedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!change || change.at === announcedAtRef.current) return;
    announcedAtRef.current = change.at;

    const copy = COPY[change.kind];
    toast.info(t(copy.key, { defaultValue: copy.fallback, count: change.count }), { id: TOAST_ID });
  }, [change, t]);
};
