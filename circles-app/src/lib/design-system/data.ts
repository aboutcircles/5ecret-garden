// Circles Core — Mock data
export const CirclesData = {
  me: {
    name: 'shorn',
    handle: 'shorn',
    address: '0xc175…FdEe91',
    bio: "Building things that make sense in a world that increasingly doesn't.",
    balance: 100.34,
    mintable: 146.91,
    fromPeople: 170,
    fromGroups: 39,
  },

  contacts: [
    { name: 'paul',   handle: 'paul',    address: '0xA82F…7B14', trust: 'mutual',   verified: true,  lastInteraction: 'Sent 42 CRC',     lastNote: '2h ago · "Thanks for the gear!"', flowed: 1284.40 },
    { name: 'lina',   handle: 'lina_b',  address: '0x4Dc7…6645', trust: 'mutual',   verified: true,  lastInteraction: 'Vouched for you', lastNote: '1d ago',                          flowed: 5402.10 },
    { name: 'kasper', handle: 'kspr',    address: '0xF0B1…0091', trust: 'incoming', verified: false, lastInteraction: 'Trusted you',     lastNote: '3d ago',                          flowed: 188.90  },
    { name: 'vee',    handle: 'vee.eth', address: '0x91Ae…CC32', trust: 'mutual',   verified: true,  lastInteraction: 'Received 8.40',   lastNote: '5d ago',                          flowed: 322.00  },
    { name: 'martin', handle: 'martin',  address: '0x77b2…F102', trust: 'outgoing', verified: false, lastInteraction: 'You trusted',     lastNote: '1w ago',                          flowed: 0       },
    { name: 'rin',    handle: 'rin',     address: '0xB14D…AA2C', trust: 'mutual',   verified: false, lastInteraction: 'Sent 12.00',      lastNote: '2w ago',                          flowed: 480.20  },
    { name: 'omar',   handle: 'omar.k',  address: '0x6033…1100', trust: 'mutual',   verified: true,  lastInteraction: 'Group invite',    lastNote: '1mo ago',                         flowed: 92.60   },
  ],

  groups: [
    { id: 'mi-familia',  name: 'mi familia',    symbol: 'FMLY', description: 'Close family pool — groceries, gifts, helping each other through the year.', members: 14,   weekVolume: 320,   balance: 84.50,   joined: true,  gradient: 'linear-gradient(120deg,#FBE3D8,#F5DCE6)' },
    { id: 'labs',        name: 'LABS Testing',  symbol: 'LABS', description: 'Group currency for the Circles Labs experiments and prototypes.',           members: 86,   weekVolume: 1840,  balance: 421.20,  joined: true,  gradient: 'linear-gradient(120deg,#EEEBFA,#FBEFCB)' },
    { id: 'old-group',   name: 'old group',     symbol: 'OLD',  description: 'Long-running test group from the v1 days. Still rolling.',                  members: 42,   weekVolume: 24,    balance: 12.80,   joined: true,  gradient: 'linear-gradient(120deg,#DCEBDF,#FBEFCB)' },
    { id: 'gnosis',      name: 'Gnosis',        symbol: 'GNO',  description: 'Builders, researchers, and friends of the Gnosis Chain ecosystem.',         members: 412,  weekVolume: 22409, balance: 1022.40, joined: false, gradient: 'linear-gradient(120deg,#EEEBFA,#FBE3D8)' },
    { id: 'berlin-coop', name: 'Berlin Coop',   symbol: 'BLN',  description: 'Mutual-aid coop in Kreuzberg. Repair, childcare, food share.',               members: 1284, weekVolume: 7800,  balance: 240.10,  joined: false, gradient: 'linear-gradient(120deg,#FBE3D8,#FBEFCB)' },
    { id: 'demo',        name: 'ui demo group', symbol: 'DEMO', description: 'Public sandbox for trying out group UX flows.',                              members: 23,   weekVolume: 60,    balance: 4.10,    joined: true,  gradient: 'linear-gradient(120deg,#DCEBDF,#EEEBFA)' },
  ],

  activity: [
    { kind: 'sent',     who: 'test physical paygate',      avatar: 'token', amount: -0.10,   when: '12 min ago', date: 'Today' },
    { kind: 'received', who: 'Teenage Engineering PO‑14',  avatar: 'group', amount: 5399.99, when: '34 min ago', date: 'Today',     note: 'Thanks for the gear!' },
    { kind: 'mint',     who: 'Daily mint',                              amount: 24.00,   when: '1 h ago',    date: 'Today',     system: true },
    { kind: 'sent',     who: '0x0a3b…2131bd',              avatar: 'addr',  amount: -0.004,  when: '1 h ago',    date: 'Today' },
    { kind: 'sent',     who: '0xEEd6…7911C5',              avatar: 'addr',  amount: -2.40,   when: '1 h ago',    date: 'Today' },
    { kind: 'received', who: 'shorn',                                   amount: 2.40,    when: '1 h ago',    date: 'Today',     note: 'Collected CRC' },
    { kind: 'received', who: '0x0a3b…2131bd',              avatar: 'addr',  amount: 18.28,   when: '2 h ago',    date: 'Yesterday' },
    { kind: 'received', who: '0xEEd6…7911C5',              avatar: 'addr',  amount: 2.40,    when: '4 h ago',    date: 'Yesterday' },
    { kind: 'received', who: '0xe6aB…BBf5E7',              avatar: 'addr',  amount: 34.94,   when: '6 h ago',    date: 'Yesterday' },
    { kind: 'received', who: '0x0475…15b81d',              avatar: 'addr',  amount: 27.91,   when: 'yesterday',  date: 'Yesterday' },
    { kind: 'received', who: '0x3870…FeO48A',              avatar: 'addr',  amount: 152.10,  when: 'yesterday',  date: 'Yesterday' },
  ],

  offers: [
    { id: 'po14',     title: 'Teenage Engineering PO‑14',   subtitle: 'New, sealed. Ships from Berlin.',      seller: 'rost.berlin',   distance: '2km',  price: 5400, kind: 'Hardware', kindColor: 'lilac',   glyph: 'PO‑14', bg: 'linear-gradient(135deg,#5849D4,#352899)', ink: '#fff', featured: true },
    { id: 'coffee',   title: 'Berlin Coffee — 12 pack',     subtitle: 'House blend, freshly roasted.',        seller: 'rost.berlin',   distance: '2km',  price: 84,   kind: 'Food',     kindColor: 'coral',   glyph: '☕',    bg: 'linear-gradient(135deg,#E8896A,#FBE3D8)', ink: '#fff' },
    { id: 'workshop', title: 'Workshop · Mutual Credit',    subtitle: '2-hour intro · in-person, Sat 14:00', seller: 'circles labs', distance: '6km',  price: 30,   kind: 'Event',    kindColor: 'lilac',   glyph: '◐◑',   bg: 'linear-gradient(135deg,#B8AEEA,#EEEBFA)', ink: '#1F1146' },
    { id: 'notebook', title: 'Hand-bound Notebook',         subtitle: 'A5, 200 pages, linen cover.',          seller: 'paper & ink',   distance: '3km',  price: 22,   kind: 'Goods',    kindColor: 'butter',  glyph: '✎',    bg: 'linear-gradient(135deg,#F4D27A,#FBEFCB)', ink: '#7B5215' },
    { id: 'veg',      title: 'Veggie box · weekly',         subtitle: 'Seasonal · brought to your door.',     seller: 'farm coop',     distance: '12km', price: 38,   kind: 'Food',     kindColor: 'sage',    glyph: '🌿',   bg: 'linear-gradient(135deg,#7BA887,#DCEBDF)', ink: '#fff' },
    { id: 'dappcon',  title: 'Dappcon ticket — early bird', subtitle: 'June 17–19 · early bird, 3 left.',     seller: 'dappcon.io',    distance: '·',    price: 220,  kind: 'Event',    kindColor: 'lilac',   glyph: 'DC',   bg: 'linear-gradient(135deg,#352899,#5849D4)', ink: '#fff', featured: true },
    { id: 'studio',   title: 'Studio session · 1h',         subtitle: 'Mixing, mastering, by appt.',          seller: 'haus.studio',   distance: '4km',  price: 45,   kind: 'Service',  kindColor: 'rose',    glyph: '♪',    bg: 'linear-gradient(135deg,#D4789F,#F5DCE6)', ink: '#fff' },
    { id: 'hoodie',   title: 'CRC Hoodie',                  subtitle: 'Heavyweight · M, L, XL.',              seller: 'circles merch', distance: '·',    price: 60,   kind: 'Apparel',  kindColor: 'neutral', glyph: '◯',    bg: 'linear-gradient(135deg,#0F0A1E,#2A1F4A)', ink: '#F4D27A' },
  ],
};
