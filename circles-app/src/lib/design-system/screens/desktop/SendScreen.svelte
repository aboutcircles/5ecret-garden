<script lang="ts">
  import { T } from '../../tokens.js';
  import { CirclesData } from '../../data.js';
  import Icon from '../../Icon.svelte';
  import Avatar from '../../Avatar.svelte';
  import Button from '../../Button.svelte';
  import Pill from '../../Pill.svelte';
  import Card from '../../Card.svelte';
  import Money from '../../Money.svelte';

  const recipient = CirclesData.contacts[0];
  let step = $state(2);
  const steps = ['Recipient', 'Amount', 'Review'];

  const trustPath = [
    { name: 'shorn (you)', sub: 'Issuer',              amount: 42.00 },
    { name: 'lina',        sub: 'Mutual trust · 2y',   amount: 42.00 },
    { name: 'kasper',      sub: "Mutual · met via lina",amount: 42.00 },
    { name: 'paul',        sub: 'Recipient',            amount: 42.00 },
  ];
</script>

<div style="display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: flex-start;">
  <!-- Form -->
  <Card padding={0}>
    <div style="padding: 22px 28px 18px; border-bottom: 1px solid {T.hairlineSoft};">
      <div style="display: flex; align-items: flex-start; justify-content: space-between;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 11.5px; font-weight: 600; color: {T.inkMuted}; letter-spacing: 0.06em; text-transform: uppercase;">Step 2 of 3</span>
          <h2 style="margin: 0; font-family: {T.fontDisplay}; font-size: 28px; font-weight: 400; color: {T.ink}; letter-spacing: -0.02em;">How much to send?</h2>
        </div>
        <!-- Stepper -->
        <div style="display: flex; align-items: center; gap: 6px;">
          {#each steps as label, i}
            {@const idx = i + 1}
            {@const isActive = idx === step}
            {@const isDone = idx < step}
            <button onclick={() => step = idx} style="
              display: inline-flex; align-items: center; gap: 7px;
              padding: 6px 12px; border-radius: 9999px; border: 0; cursor: pointer;
              background: {isActive ? T.ink : isDone ? T.primarySoft : T.pageDeep};
              color: {isActive ? '#fff' : isDone ? T.primaryDeep : T.inkMuted};
              font-family: {T.fontSans}; font-size: 12.5px; font-weight: 580;
            ">
              <span style="
                width:18px;height:18px;border-radius:9999px;
                background:{isActive ? T.primary : isDone ? T.primary : 'rgba(15,10,30,0.1)'};
                color:#fff;display:inline-flex;align-items:center;justify-content:center;
                font-size:10px;font-weight:600;
              ">{#if isDone}<Icon name="check" size={11} stroke="#fff" strokeWidth={2.6} />{:else}{idx}{/if}</span>
              {label}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div style="padding: 28px;">
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <!-- To -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:12px;font-weight:580;color:{T.inkBody};letter-spacing:0.02em;">To</span>
            <span style="font-size:11.5px;color:{T.inkSubtle};">Locked in step 1</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:{T.surfaceAlt};border-radius:{T.radius.sm}px;border:1px solid {T.hairlineSoft};">
            <Avatar seed={recipient.name} size={32} />
            <div style="display:flex;flex-direction:column;flex:1;">
              <div style="font-size:14px;font-weight:580;color:{T.ink};">{recipient.name}</div>
              <div style="font-family:{T.fontMono};font-size:11px;color:{T.inkMuted};">0xA82F…7B14</div>
            </div>
            <Pill color="sage">Mutual trust</Pill>
            <button style="background:transparent;border:0;cursor:pointer;font-family:{T.fontSans};font-size:12.5px;font-weight:580;color:{T.primary};">Change</button>
          </div>
        </div>

        <!-- Route -->
        <div>
          <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:580;color:{T.inkBody};letter-spacing:0.02em;">Route</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:{T.surfaceAlt};border:1px solid {T.hairline};border-radius:{T.radius.sm}px;">
            <div style="width:36px;height:36px;border-radius:{T.radius.sm}px;background:{T.primarySoft};display:flex;align-items:center;justify-content:center;">
              <Icon name="sparkle" size={18} stroke={T.primary} strokeWidth={2} />
            </div>
            <div style="display:flex;flex-direction:column;gap:1px;flex:1;">
              <div style="font-size:14px;font-weight:580;color:{T.ink};">Auto-route</div>
              <div style="font-size:12px;color:{T.inkMuted};">Uses your trust network · 2 hops · ~3s</div>
            </div>
            <Pill color="lilac">Recommended</Pill>
            <button style="background:transparent;border:0;cursor:pointer;font-family:{T.fontSans};font-size:12.5px;font-weight:580;color:{T.primary};">Change</button>
          </div>
        </div>

        <!-- Amount -->
        <div>
          <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:580;color:{T.inkBody};letter-spacing:0.02em;">Amount</span></div>
          <div style="padding:20px 22px;background:{T.surfaceAlt};border:1px solid {T.hairline};border-radius:{T.radius.md}px;">
            <div style="display:flex;align-items:flex-end;justify-content:space-between;">
              <div style="flex:1;">
                <div style="font-size:11.5px;font-weight:580;color:{T.inkMuted};letter-spacing:0.04em;text-transform:uppercase;margin-bottom:4px;">Amount</div>
                <div style="display:flex;align-items:baseline;gap:10px;">
                  <input value="42.00" style="border:0;outline:none;background:transparent;font-family:{T.fontDisplay};font-size:56px;font-weight:400;color:{T.ink};letter-spacing:-0.025em;width:220px;padding:0;" />
                  <span style="font-family:{T.fontSans};font-size:18px;color:{T.inkMuted};">CRC</span>
                </div>
                <div style="font-size:12px;color:{T.inkSubtle};margin-top:4px;font-family:{T.fontMono};">≈ €38.22 · routed via lina, kasper</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                <div style="display:flex;gap:6px;">
                  {#each ['10', '50', 'Half', 'Max'] as v}
                    <button style="padding:5px 11px;border-radius:9999px;background:{T.surface};border:1px solid {T.hairline};font-family:{T.fontSans};font-size:12px;font-weight:580;color:{T.inkBody};cursor:pointer;">{v}</button>
                  {/each}
                </div>
                <div style="font-size:11.5px;color:{T.inkSubtle};">Route cap <b style="color:{T.inkBody};font-weight:600;">6,283.82</b> / 12,492.69 CRC</div>
                <div style="width:200px;height:5px;border-radius:3px;background:{T.pageDeep};overflow:hidden;position:relative;">
                  <div style="position:absolute;left:0;top:0;bottom:0;width:50%;background:{T.primary};border-radius:3px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div>
          <div style="margin-bottom:8px;"><span style="font-size:12px;font-weight:580;color:{T.inkBody};letter-spacing:0.02em;">Note</span></div>
          <textarea style="width:100%;min-height:64px;padding:12px 14px;background:{T.surfaceAlt};border:1px solid {T.hairline};border-radius:{T.radius.sm}px;resize:none;outline:none;font-family:{T.fontSans};font-size:14px;color:{T.ink};line-height:1.45;box-sizing:border-box;">Thanks for the gear!</textarea>
        </div>

        <!-- Info banner -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-radius:{T.radius.md}px;background:{T.primaryFaint};border:1px solid {T.primarySoft};">
          <div style="display:flex;align-items:flex-start;gap:10px;">
            <Icon name="info" size={18} stroke={T.primary} />
            <div style="display:flex;flex-direction:column;gap:1px;">
              <div style="font-size:13px;font-weight:580;color:{T.primaryDeep};">Auto-routed through 2 intermediaries</div>
              <div style="font-size:12px;color:{T.inkBody};">Your CRC will hop via <b>lina</b> and <b>kasper</b>. Total gas ≈ €0.003.</div>
            </div>
          </div>
          <button style="background:transparent;border:0;cursor:pointer;font-family:{T.fontSans};font-size:12.5px;font-weight:580;color:{T.primary};">View path →</button>
        </div>

        <!-- Actions -->
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:4px;">
          <Button variant="ghost" size="md">Cancel</Button>
          <Button variant="secondary" size="md" icon="arrowLeft">Back</Button>
          <Button variant="primary" size="md" iconRight="arrowRight">Review &amp; send</Button>
        </div>
      </div>
    </div>
  </Card>

  <!-- Trust path side panel -->
  <div style="display:flex;flex-direction:column;gap:16px;">
    <Card padding={20}>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:13px;font-weight:580;color:{T.ink};">Trust path</span>
        <Pill color="sage">Verified</Pill>
      </div>
      <div style="margin-top:16px;">
        {#each trustPath as p, i}
          <div style="display:grid;grid-template-columns:36px 1fr auto;gap:12px;align-items:center;padding:10px 0;position:relative;">
            <div style="position:relative;">
              <Avatar seed={p.name} size={32} />
              {#if i < trustPath.length - 1}
                <span style="position:absolute;left:16px;top:36px;width:1px;height:32px;border-left:1.5px dashed {T.primary};"></span>
              {/if}
            </div>
            <div style="display:flex;flex-direction:column;gap:1px;">
              <div style="font-size:13.5px;font-weight:540;color:{T.ink};">{p.name}</div>
              <div style="font-size:11.5px;color:{T.inkMuted};">{p.sub}</div>
            </div>
            <Money value={p.amount} size={12.5} weight={580} />
          </div>
        {/each}
      </div>
    </Card>

    <Card padding={20} style="background:{T.surfaceAlt};">
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <Icon name="shield" size={16} stroke={T.sage} strokeWidth={1.8} />
          <span style="font-size:13px;font-weight:580;color:{T.ink};">What happens at send</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          {#each ["lina accepts your CRC, issues hers to kasper", "kasper accepts lina's, issues his to paul", "paul receives 42.00 CRC in his own currency"] as t, i}
            <div style="display:flex;align-items:flex-start;gap:8px;">
              <span style="width:18px;height:18px;border-radius:9999px;flex-shrink:0;background:{T.primarySoft};color:{T.primaryDeep};display:inline-flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;">{i+1}</span>
              <span style="font-size:12.5px;color:{T.inkBody};line-height:1.45;">{t}</span>
            </div>
          {/each}
        </div>
      </div>
    </Card>
  </div>
</div>
