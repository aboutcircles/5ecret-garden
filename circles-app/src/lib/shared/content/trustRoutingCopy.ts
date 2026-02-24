export const TRUST_ROUTING_HELP_LINES: string[] = [
  'Trust means you accept this account’s Circles.',
  'Routing can change which Circles you hold (total stays the same).',
  'Untrust stops accepting more from them.',
];

export const AUTO_ROUTE_HELP_LINES: string[] = [
  'Uses your trust network to deliver the payment.',
  'Routing can change which Circles you hold — not how many.',
];

export const TRUST_QUICK_HELP_LINES: string[] = [
  'Trust means you accept this account’s Circles.',
  'Routing can change whose Circles you hold (total stays the same).',
  'You can untrust later to stop accepting more.',
];

export const UNTRUST_QUICK_HELP_LINES: string[] = [
  'Untrust stops accepting their Circles from now on.',
  'It doesn’t remove balances you already hold.',
  'Some routes may stop working until other paths exist.',
];

export const TRUST_EXPLAINER_POINTS: string[] = [
  'Trust is on/off: you either accept this account’s Circles or you don’t.',
  'Trust is one-way: they need to trust you separately.',
  'Trust enables routing. When payments route through the network, the mix of Circles you hold can change (your total stays the same).',
  'If you end up holding Circles that are hard to spend, you can untrust to stop accepting more through this connection.',
];

export const UNTRUST_EXPLAINER_POINTS: string[] = [
  'Untrust is on/off: it removes the trust link.',
  'Trust is one-way: untrusting doesn’t remove their trust in you.',
  'Some routes that worked before may stop working.',
  'You can trust again later.',
];

export const WHY_MANY_CIRCLES_LINES: string[] = [
  'You can hold Circles from many people and groups.',
  'Trust decides which Circles you accept.',
  'Auto route keeps the amount the same, but may change whose Circles you hold.',
];
