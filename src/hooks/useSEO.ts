import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
}

export function useSEO({ title, description, url, image }: SEOProps) {
  useEffect(() => {
    // Set Document Title
    document.title = title;

    // Helper to set or create meta tags
    const setMetaTag = (attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard Meta
    setMetaTag('name', 'description', description);

    // Open Graph
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    if (url) setMetaTag('property', 'og:url', url);
    if (image) setMetaTag('property', 'og:image', image);

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    if (image) setMetaTag('name', 'twitter:image', image);

    // Cleanup not strictly necessary for SPAs if every page sets it, 
    // but good practice to reset title if leaving page
    return () => {
      // Optional: Reset to default
      // document.title = 'Nine Dashboard';
    };
  }, [title, description, url, image]);
}
