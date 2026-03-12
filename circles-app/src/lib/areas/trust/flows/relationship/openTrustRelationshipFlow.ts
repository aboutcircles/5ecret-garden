import { openStep } from '$lib/shared/flow';
import type { Address } from '@aboutcircles/sdk-types';
import { openAddTrustFlow } from '$lib/areas/trust/flows/addTrust/openAddTrustFlow';
import Untrust from '$lib/areas/contacts/ui/pages/Untrust.svelte';
import ConfirmGatewayUntrust from '$lib/areas/settings/flows/gateway/ConfirmGatewayUntrust.svelte';

type ActorType = 'avatar' | 'group' | 'gateway';

type OpenTrustRelationshipFlowParams =
  | {
      mode: 'add';
      actorType: ActorType;
      actorAddress: Address;
      selectedTrustees?: Address[];
      gatewayExpiry?: bigint;
      onCompleted?: (addresses: Address[]) => void | Promise<void>;
    }
  | {
      mode: 'remove';
      actorType: ActorType;
      actorAddress: Address;
      trustReceiver: Address;
      trustVersion?: number;
      onCompleted?: () => void | Promise<void>;
    };

export function openTrustRelationshipFlow(params: OpenTrustRelationshipFlowParams): void {
  if (params.mode === 'add') {
    openAddTrustFlow({
      context: {
        actorType: params.actorType,
        actorAddress: params.actorAddress,
        selectedTrustees: params.selectedTrustees ?? [],
        gatewayExpiry: params.gatewayExpiry,
      },
      onCompleted: params.onCompleted,
    });
    return;
  }

  if (params.actorType === 'gateway') {
    openStep({
      title: 'Remove trust',
      component: ConfirmGatewayUntrust,
      props: {
        gateway: params.actorAddress,
        trustReceiver: params.trustReceiver,
        onDone: params.onCompleted,
      },
      key: `pg-untrust:${params.actorAddress}:${params.trustReceiver}`,
    });
    return;
  }

  openStep({
    title: 'Untrust',
    component: Untrust,
    props: {
      address: params.trustReceiver,
      trustVersion: params.trustVersion ?? 2,
    },
  });
}
