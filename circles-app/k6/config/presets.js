export const PRESETS = {
  full: {
    toggles: {
      enableScroll: true,
      enableProfileBrowse: true,
      enableSendPathfinder: true,
      enableProfileUpdate: true,
      enableMarketBackground: true,
      enableSeed: true,
    },
    weights: {
      scroll: 40,
      profileBrowse: 25,
      sendPathfinder: 25,
      profileUpdate: 10,
    },
  },
  'wallet-only': {
    toggles: {
      enableScroll: true,
      enableProfileBrowse: true,
      enableSendPathfinder: true,
      enableProfileUpdate: true,
      enableMarketBackground: false,
      enableSeed: true,
    },
    weights: {
      scroll: 45,
      profileBrowse: 25,
      sendPathfinder: 20,
      profileUpdate: 10,
    },
  },
  'pathfinder-only': {
    toggles: {
      enableScroll: false,
      enableProfileBrowse: false,
      enableSendPathfinder: true,
      enableProfileUpdate: false,
      enableMarketBackground: false,
      enableSeed: true,
    },
    weights: {
      scroll: 0,
      profileBrowse: 0,
      sendPathfinder: 100,
      profileUpdate: 0,
    },
  },
  'scroll-only': {
    toggles: {
      enableScroll: true,
      enableProfileBrowse: false,
      enableSendPathfinder: false,
      enableProfileUpdate: false,
      enableMarketBackground: false,
      enableSeed: true,
    },
    weights: {
      scroll: 100,
      profileBrowse: 0,
      sendPathfinder: 0,
      profileUpdate: 0,
    },
  },
};
