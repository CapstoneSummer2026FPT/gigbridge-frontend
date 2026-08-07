import DOMPurify from 'dompurify';

const RESOURCE_ATTRIBUTES = [
  'action',
  'background',
  'data',
  'formaction',
  'href',
  'manifest',
  'ping',
  'poster',
  'src',
  'srcset',
  'xlink:href',
] as const;

const SAFE_INLINE_IMAGE = /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z\d+/=\s]+$/i;
const UNSAFE_INLINE_CSS = /(?:@import|\\|behavior\s*:|expression\s*\(|image-set\s*\(|-moz-binding|\burl\b)/i;

/**
 * Creates inert contract markup that can be attached to the application DOM for
 * html2canvas. Network-backed resources are removed; only embedded raster images
 * are retained so the PDF renderer cannot make attacker-controlled requests.
 */
export const sanitizePdfHtml = (html: string): DocumentFragment => {
  const fragment = DOMPurify.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { html: true },
    SANITIZE_NAMED_PROPS: true,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: [
      'base',
      'embed',
      'form',
      'iframe',
      'link',
      'meta',
      'object',
      'script',
      'source',
      'style',
      'track',
    ],
    FORBID_ATTR: ['srcdoc'],
  });

  fragment.querySelectorAll('*').forEach(element => {
    RESOURCE_ATTRIBUTES.forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;

      const value = element.getAttribute(attribute) ?? '';
      const isEmbeddedRasterImage =
        attribute === 'src' && element.tagName === 'IMG' && SAFE_INLINE_IMAGE.test(value);
      if (!isEmbeddedRasterImage) element.removeAttribute(attribute);
    });

    const inlineStyle = element.getAttribute('style');
    if (inlineStyle && UNSAFE_INLINE_CSS.test(inlineStyle)) {
      element.removeAttribute('style');
    }
  });

  return fragment;
};
