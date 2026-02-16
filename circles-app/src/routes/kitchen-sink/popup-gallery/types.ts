export type GalleryStep = {
  id: string;
  title: string;
  purpose: string;
  component: any;
  propsFactory?: () => Record<string, any>;
  inlineDefault?: boolean;
};

export type ViewportMode = 'phone' | 'tablet';

export type GalleryFlowEntry = {
  id: string;
  kind: 'flow';
  label: string;
  domain: string;
  purpose: string;
  /** Long-form flow description shown in the gallery as a collapsible panel. */
  details?: string;
  entrypoints?: string[];
  steps: GalleryStep[];
};

export type GalleryStandaloneEntry = {
  id: string;
  kind: 'standalone';
  label: string;
  domain: string;
  purpose: string;
  /** Long-form popup description shown in the gallery as a collapsible panel. */
  details?: string;
  entrypoints?: string[];
  step: GalleryStep;
};

export type GalleryEntry = GalleryFlowEntry | GalleryStandaloneEntry;
