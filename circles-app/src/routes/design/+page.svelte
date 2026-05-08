<script lang="ts">
  import { T } from '$lib/design-system/tokens.js';

  // Layout
  import AppShell from '$lib/design-system/AppShell.svelte';
  import TopBar from '$lib/design-system/TopBar.svelte';
  import MobileShell from '$lib/design-system/MobileShell.svelte';

  // Primitives
  import Icon from '$lib/design-system/Icon.svelte';
  import Pill from '$lib/design-system/Pill.svelte';

  // Desktop Screens
  import WalletScreen from '$lib/design-system/screens/desktop/WalletScreen.svelte';
  import SendScreen from '$lib/design-system/screens/desktop/SendScreen.svelte';
  import TransactionDetail from '$lib/design-system/screens/desktop/TransactionDetail.svelte';
  import ContactsScreen from '$lib/design-system/screens/desktop/ContactsScreen.svelte';
  import GroupsScreen from '$lib/design-system/screens/desktop/GroupsScreen.svelte';
  import MarketScreen from '$lib/design-system/screens/desktop/MarketScreen.svelte';
  import ProfileScreen from '$lib/design-system/screens/desktop/ProfileScreen.svelte';

  // Mobile Screens
  import MobileWallet from '$lib/design-system/screens/mobile/MobileWallet.svelte';
  import MobileSend from '$lib/design-system/screens/mobile/MobileSend.svelte';
  import MobileContacts from '$lib/design-system/screens/mobile/MobileContacts.svelte';
  import MobileGroups from '$lib/design-system/screens/mobile/MobileGroups.svelte';
  import MobileMarket from '$lib/design-system/screens/mobile/MobileMarket.svelte';
  import MobileProfile from '$lib/design-system/screens/mobile/MobileProfile.svelte';

  // Modals
  import ReceiveModal from '$lib/design-system/screens/modals/ReceiveModal.svelte';
  import TrustModal from '$lib/design-system/screens/modals/TrustModal.svelte';
  import ConfirmModal from '$lib/design-system/screens/modals/ConfirmModal.svelte';
  import MintModal from '$lib/design-system/screens/modals/MintModal.svelte';
  import CommandPalette from '$lib/design-system/screens/modals/CommandPalette.svelte';

  // iOS frame dimensions
  const IOS_W = 402;
  const IOS_H = 874;

  // Desktop frame dimensions
  const DESKTOP_W = 1440;
  const DESKTOP_H = 900;

  // Canvas colors
  const CANVAS_BG = '#F0EEE9';

  let activeDesktop = $state('wallet');

  const desktopScreens: Record<string, any> = {
    wallet:    WalletScreen,
    send:      SendScreen,
    contacts:  ContactsScreen,
    groups:    GroupsScreen,
    market:    MarketScreen,
    profile:   ProfileScreen,
    txdetail:  TransactionDetail,
  };

  const mobileScreens = [
    { id: 'wallet',   label: 'Wallet',   component: MobileWallet },
    { id: 'send',     label: 'Send',     component: MobileSend },
    { id: 'contacts', label: 'Contacts', component: MobileContacts },
    { id: 'groups',   label: 'Groups',   component: MobileGroups },
    { id: 'market',   label: 'Market',   component: MobileMarket },
    { id: 'profile',  label: 'Profile',  component: MobileProfile },
  ];

  const mobileModals = [
    { id: 'receive', label: 'Receive',      component: ReceiveModal,  height: 520 },
    { id: 'trust',   label: 'Trust someone',component: TrustModal,    height: 560 },
    { id: 'confirm', label: 'Confirm tx',   component: ConfirmModal,  height: 560 },
    { id: 'mint',    label: 'Mint',         component: MintModal,     height: 540 },
  ];

  const desktopModals = [
    { id: 'receive',  label: 'Receive Drawer',  component: ReceiveModal,  title: 'Receive' },
    { id: 'trust',    label: 'Trust Drawer',    component: TrustModal,    title: 'Trust someone' },
    { id: 'confirm',  label: 'Confirm Drawer',  component: ConfirmModal,  title: 'Sign to send' },
    { id: 'mint',     label: 'Mint Drawer',     component: MintModal,     title: 'Daily mint' },
  ];
</script>

<svelte:head>
  <title>Circles Core — Design</title>
</svelte:head>

<div style="
  min-height: 100vh; background: {CANVAS_BG};
  font-family: {T.fontSans}; color: {T.inkBody};
  overflow-x: auto;
  background-image: radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px);
  background-size: 24px 24px;
">
  <!-- HEADER -->
  <div style="
    position: sticky; top: 0; z-index: 50;
    background: rgba(240,238,233,0.92); backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding: 14px 32px;
    display: flex; align-items: center; gap: 16px;
  ">
    <div style="display:flex;align-items:center;gap:10px;">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path d="M16 4a12 12 0 1 0 0 24V4Z" fill="{T.coral}" />
        <path d="M16 4a12 12 0 1 1 0 24V4Z" fill="{T.primary}" />
        <circle cx="16" cy="16" r="5" fill="{CANVAS_BG}" />
      </svg>
      <span style="font-family:{T.fontSans};font-weight:700;font-size:16px;color:{T.ink};letter-spacing:-0.01em;">Circles Core</span>
    </div>
    <Pill color="lilac">Design Canvas</Pill>
    <div style="flex:1;"></div>
    <span style="font-size:12px;color:rgba(60,50,40,0.6);">SvelteKit · Svelte 5 · Tailwind</span>
  </div>

  <div style="padding: 48px 32px 80px; display: flex; flex-direction: column; gap: 80px; max-width: 1800px; margin: 0 auto;">

    <!-- ─────────────────────────────────────── -->
    <!-- SECTION: Desktop Screens              -->
    <!-- ─────────────────────────────────────── -->
    <section>
      <div style="margin-bottom: 32px;">
        <div style="font-size:11px;font-weight:600;color:rgba(60,50,40,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Desktop</div>
        <h2 style="margin:0;font-family:{T.fontDisplay};font-size:36px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;">App Screens — 1440 × 900</h2>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(60,50,40,0.6);">Interactive — click sidebar nav to switch screens.</p>
      </div>

      <!-- Nav tabs for screen selection -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap;">
        {#each Object.keys(desktopScreens) as id}
          <button
            onclick={() => activeDesktop = id}
            style="
              padding:6px 14px;border-radius:9999px;border:0;cursor:pointer;
              background:{activeDesktop === id ? T.ink : T.surface};
              color:{activeDesktop === id ? '#fff' : T.inkBody};
              font-family:{T.fontSans};font-size:13px;font-weight:580;
              box-shadow:{T.shadow.xs};
              text-transform:capitalize;
            "
          >{id === 'txdetail' ? 'Tx Detail' : id.charAt(0).toUpperCase() + id.slice(1)}</button>
        {/each}
      </div>

      <!-- Desktop artboard -->
      <div style="
        width:{DESKTOP_W}px;height:{DESKTOP_H}px;
        border-radius:16px;overflow:hidden;
        box-shadow:0 8px 40px rgba(0,0,0,0.16),0 0 0 1px rgba(0,0,0,0.06);
        position:relative;
      ">
        {#if activeDesktop === 'wallet'}
          <AppShell active="wallet" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Wallet" eyebrow="Overview" />{/snippet}
            <WalletScreen />
          </AppShell>
        {:else if activeDesktop === 'send'}
          <AppShell active="send" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Send" subtitle="Route CRC through your trust network." />{/snippet}
            <SendScreen />
          </AppShell>
        {:else if activeDesktop === 'contacts'}
          <AppShell active="contacts" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Contacts" eyebrow="Network" subtitle="People you trust and who trust you." />{/snippet}
            <ContactsScreen />
          </AppShell>
        {:else if activeDesktop === 'groups'}
          <AppShell active="groups" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Groups" eyebrow="Communities" />{/snippet}
            <GroupsScreen />
          </AppShell>
        {:else if activeDesktop === 'market'}
          <AppShell active="market" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Market" eyebrow="Offers" subtitle="Goods, services, and events from your network." />{/snippet}
            <MarketScreen />
          </AppShell>
        {:else if activeDesktop === 'profile'}
          <AppShell active="wallet" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Profile" />{/snippet}
            <ProfileScreen />
          </AppShell>
        {:else if activeDesktop === 'txdetail'}
          <AppShell active="wallet" onNavigate={(id) => activeDesktop = id}>
            {#snippet top()}<TopBar title="Activity" eyebrow="Wallet" />{/snippet}
            <TransactionDetail />
          </AppShell>
        {/if}
      </div>
    </section>

    <!-- ─────────────────────────────────────── -->
    <!-- SECTION: Mobile Screens               -->
    <!-- ─────────────────────────────────────── -->
    <section>
      <div style="margin-bottom:32px;">
        <div style="font-size:11px;font-weight:600;color:rgba(60,50,40,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Mobile</div>
        <h2 style="margin:0;font-family:{T.fontDisplay};font-size:36px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;">Mobile Screens — 402 × 874</h2>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(60,50,40,0.6);">iOS form factor with bottom tab bar and center FAB.</p>
      </div>

      <div style="display:flex;align-items:flex-start;gap:28px;overflow-x:auto;padding-bottom:12px;">
        {#each mobileScreens as screen}
          {@const ScreenComp = screen.component}
          <div style="flex:0 0 auto;">
            <!-- Label -->
            <div style="margin-bottom:12px;font-size:12px;font-weight:600;color:rgba(60,50,40,0.7);">{screen.label}</div>
            <!-- iOS Frame -->
            <div style="position:relative;width:{IOS_W}px;">
              <!-- Device shell -->
              <div style="
                width:{IOS_W}px;height:{IOS_H}px;
                border-radius:52px;
                background:#1A1A1A;
                box-shadow:0 30px 80px rgba(0,0,0,0.4),0 0 0 2px #333,inset 0 0 0 2px #444;
                overflow:hidden;position:relative;
              ">
                <!-- Screen bezel -->
                <div style="position:absolute;inset:14px;border-radius:42px;overflow:hidden;background:{T.page};">
                  <!-- Status bar -->
                  <div style="
                    position:absolute;top:0;left:0;right:0;height:47px;
                    display:flex;align-items:center;justify-content:space-between;
                    padding:0 28px;z-index:30;
                    background:transparent;
                  ">
                    <span style="font-size:12px;font-weight:600;color:{T.ink};font-family:{T.fontSans};">9:41</span>
                    <div style="
                      width:126px;height:34px;background:#1A1A1A;border-radius:9999px;
                      position:absolute;left:50%;transform:translateX(-50%);top:8px;
                    "></div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <svg width="17" height="12" viewBox="0 0 17 12" fill="{T.ink}"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/><rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity="0.3"/></svg>
                      <svg width="16" height="12" viewBox="0 0 24 12" stroke="{T.ink}" stroke-width="1.5" fill="none"><rect x="1" y="2" width="18" height="9" rx="3"/><path d="M20 5v3a3 3 0 0 0 0-3z" fill="{T.ink}" stroke="none"/></svg>
                    </div>
                  </div>
                  <!-- Screen content -->
                  <div style="position:absolute;inset:0;overflow:hidden;">
                    <ScreenComp />
                  </div>
                  <!-- Home indicator -->
                  <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;background:{T.ink};opacity:0.2;border-radius:9999px;"></div>
                </div>
                <!-- Side buttons -->
                <div style="position:absolute;left:-3px;top:120px;width:3px;height:36px;background:#2A2A2A;border-radius:2px 0 0 2px;"></div>
                <div style="position:absolute;left:-3px;top:172px;width:3px;height:62px;background:#2A2A2A;border-radius:2px 0 0 2px;"></div>
                <div style="position:absolute;left:-3px;top:248px;width:3px;height:62px;background:#2A2A2A;border-radius:2px 0 0 2px;"></div>
                <div style="position:absolute;right:-3px;top:172px;width:3px;height:90px;background:#2A2A2A;border-radius:0 2px 2px 0;"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- ─────────────────────────────────────── -->
    <!-- SECTION: Mobile Modals / Sheets        -->
    <!-- ─────────────────────────────────────── -->
    <section>
      <div style="margin-bottom:32px;">
        <div style="font-size:11px;font-weight:600;color:rgba(60,50,40,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Modal System — Mobile</div>
        <h2 style="margin:0;font-family:{T.fontDisplay};font-size:36px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;">Bottom Sheets</h2>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(60,50,40,0.6);">Shared sheet shell with drag handle, scrim, and 4 modal contents.</p>
      </div>

      <div style="display:flex;align-items:flex-start;gap:28px;overflow-x:auto;padding-bottom:12px;">
        {#each mobileModals as modal}
          {@const ModalComp = modal.component}
          <div style="flex:0 0 auto;">
            <div style="margin-bottom:12px;font-size:12px;font-weight:600;color:rgba(60,50,40,0.7);">{modal.label}</div>
            <div style="position:relative;width:{IOS_W}px;">
              <div style="
                width:{IOS_W}px;height:{IOS_H}px;
                border-radius:52px;
                background:#1A1A1A;
                box-shadow:0 30px 80px rgba(0,0,0,0.4),0 0 0 2px #333,inset 0 0 0 2px #444;
                overflow:hidden;position:relative;
              ">
                <div style="position:absolute;inset:14px;border-radius:42px;overflow:hidden;background:{T.page};">
                  <!-- Status bar -->
                  <div style="position:absolute;top:0;left:0;right:0;height:47px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;z-index:30;">
                    <span style="font-size:12px;font-weight:600;color:#fff;font-family:{T.fontSans};">9:41</span>
                    <div style="width:126px;height:34px;background:#1A1A1A;border-radius:9999px;position:absolute;left:50%;transform:translateX(-50%);top:8px;"></div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff"><rect x="0" y="3" width="3" height="9" rx="1"/><rect x="4.5" y="2" width="3" height="10" rx="1"/><rect x="9" y="0" width="3" height="12" rx="1"/><rect x="13.5" y="0" width="3.5" height="12" rx="1" opacity="0.3"/></svg>
                    </div>
                  </div>
                  <!-- Base wallet screen -->
                  <div style="position:absolute;inset:0;overflow:hidden;">
                    <MobileWallet />
                  </div>
                  <!-- Scrim -->
                  <div style="position:absolute;inset:0;background:rgba(15,10,30,0.45);backdrop-filter:blur(12px);z-index:10;"></div>
                  <!-- Bottom sheet -->
                  <div style="
                    position:absolute;left:0;right:0;bottom:0;z-index:20;
                    background:{T.surface};border-radius:28px 28px 0 0;
                    height:{modal.height}px;
                    box-shadow:0 -8px 40px rgba(15,10,30,0.18);
                    display:flex;flex-direction:column;overflow:hidden;
                  ">
                    <div style="display:flex;justify-content:center;padding:10px 0 4px;">
                      <span style="width:36px;height:4px;border-radius:2px;background:rgba(15,10,30,0.18);display:block;"></span>
                    </div>
                    <div style="padding:0 22px 22px;overflow:auto;flex:1;">
                      <ModalComp />
                    </div>
                  </div>
                  <!-- Home indicator -->
                  <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;background:#fff;opacity:0.3;border-radius:9999px;z-index:25;"></div>
                </div>
                <!-- Side buttons -->
                <div style="position:absolute;left:-3px;top:120px;width:3px;height:36px;background:#2A2A2A;border-radius:2px 0 0 2px;"></div>
                <div style="position:absolute;left:-3px;top:172px;width:3px;height:62px;background:#2A2A2A;border-radius:2px 0 0 2px;"></div>
                <div style="position:absolute;left:-3px;top:248px;width:3px;height:62px;background:#2A2A2A;border-radius:2px 0 0 2px;"></div>
                <div style="position:absolute;right:-3px;top:172px;width:3px;height:90px;background:#2A2A2A;border-radius:0 2px 2px 0;"></div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- ─────────────────────────────────────── -->
    <!-- SECTION: Desktop Modals / Drawers      -->
    <!-- ─────────────────────────────────────── -->
    <section>
      <div style="margin-bottom:32px;">
        <div style="font-size:11px;font-weight:600;color:rgba(60,50,40,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Modal System — Desktop</div>
        <h2 style="margin:0;font-family:{T.fontDisplay};font-size:36px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;">Right Drawers</h2>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(60,50,40,0.6);">Same content in desktop drawer overlay. Page context preserved behind scrim.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:28px;">
        {#each desktopModals as modal}
          {@const ModalComp = modal.component}
          <div>
            <div style="margin-bottom:12px;font-size:12px;font-weight:600;color:rgba(60,50,40,0.7);">{modal.label}</div>
            <div style="
              width:{DESKTOP_W}px;height:{DESKTOP_H}px;
              border-radius:16px;overflow:hidden;
              box-shadow:0 8px 40px rgba(0,0,0,0.16),0 0 0 1px rgba(0,0,0,0.06);
              position:relative;
            ">
              <!-- Base app shell (blurred behind) -->
              <AppShell active="wallet" hideMint>
                {#snippet top()}<TopBar title="Wallet" />{/snippet}
                <!-- Skeleton placeholder -->
                <div style="display:flex;flex-direction:column;gap:16px;">
                  <div style="height:28px;width:40%;background:{T.pageDeep};border-radius:8px;"></div>
                  <div style="height:12px;width:70%;background:{T.pageDeep};border-radius:6px;opacity:0.6;"></div>
                  <div style="height:200px;background:{T.surfaceAlt};border-radius:16px;border:1px solid {T.hairlineSoft};"></div>
                  <div style="height:200px;background:{T.surfaceAlt};border-radius:16px;border:1px solid {T.hairlineSoft};"></div>
                </div>
              </AppShell>
              <!-- Scrim -->
              <div style="position:absolute;inset:0;background:rgba(15,10,30,0.45);backdrop-filter:blur(12px);z-index:10;display:flex;"></div>
              <!-- Right drawer -->
              <div style="
                position:absolute;top:0;right:0;bottom:0;width:480px;
                background:{T.surface};z-index:20;
                box-shadow:-12px 0 40px rgba(15,10,30,0.18);
                display:flex;flex-direction:column;
              ">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid {T.hairlineSoft};">
                  <span style="font-family:{T.fontDisplay};font-size:22px;color:{T.ink};letter-spacing:-0.02em;">{modal.title}</span>
                  <button style="width:32px;height:32px;border-radius:9999px;background:{T.pageDeep};border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">
                    <Icon name="close" size={14} stroke={T.inkBody} />
                  </button>
                </div>
                <div style="flex:1;overflow:auto;padding:24px;">
                  <ModalComp desktop={true} />
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- ─────────────────────────────────────── -->
    <!-- SECTION: Command Palette               -->
    <!-- ─────────────────────────────────────── -->
    <section>
      <div style="margin-bottom:32px;">
        <div style="font-size:11px;font-weight:600;color:rgba(60,50,40,0.6);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">Modal System</div>
        <h2 style="margin:0;font-family:{T.fontDisplay};font-size:36px;font-weight:400;color:{T.ink};letter-spacing:-0.02em;">Command Palette — ⌘K</h2>
        <p style="margin:8px 0 0;font-size:14px;color:rgba(60,50,40,0.6);">Universal search across people, groups, offers, and actions.</p>
      </div>

      <div style="
        width:{DESKTOP_W}px;height:{DESKTOP_H}px;
        border-radius:16px;overflow:hidden;
        box-shadow:0 8px 40px rgba(0,0,0,0.16),0 0 0 1px rgba(0,0,0,0.06);
        position:relative;
      ">
        <AppShell active="wallet" hideMint>
          {#snippet top()}<TopBar title="Wallet" />{/snippet}
          <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="height:28px;width:40%;background:{T.pageDeep};border-radius:8px;"></div>
            <div style="height:200px;background:{T.surfaceAlt};border-radius:16px;border:1px solid {T.hairlineSoft};"></div>
            <div style="height:200px;background:{T.surfaceAlt};border-radius:16px;border:1px solid {T.hairlineSoft};"></div>
          </div>
        </AppShell>
        <!-- Scrim -->
        <div style="position:absolute;inset:0;background:rgba(15,10,30,0.55);backdrop-filter:blur(12px);z-index:10;display:flex;align-items:flex-start;justify-content:center;padding-top:120px;">
          <CommandPalette />
        </div>
      </div>
    </section>

  </div>
</div>
