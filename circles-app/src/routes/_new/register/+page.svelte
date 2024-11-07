<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import { onMount } from 'svelte';
  import { circles } from '$lib/stores/circles';
  import { wallet } from '$lib/stores/wallet';
  import { goto } from '$app/navigation';
  import QrCode from '$lib/components/QrCode.svelte';

  let invitations: string[] = [];

  onMount(async () => {
    if (!$wallet?.address) {
      throw new Error('Wallet not connected');
    }
    if (!$circles?.data) {
      throw new Error('Circles SDK not initialized');
    }
    const trustRelations = $circles.data.getTrustRelations(
      $wallet.address,
      100
    );
    await trustRelations.queryNextPage();

    invitations = (trustRelations.currentPage?.results ?? [])
      .filter((o) => o.version == 2)
      .map((o) => o.truster);
  });

  function acceptInvitation(inviter: string) {
    goto('/_new/register/register-person/' + inviter?.toLowerCase());
  }
</script>

{#if invitations.length > 0}
  <div class="hero bg-info text-white py-12">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">You have been invited</h1>
        {#each invitations as inviter}
          <p class="btn my-6" on:click={() => acceptInvitation(inviter)}>
            by
            <Avatar clickable={false} address={inviter}></Avatar>
          </p>
        {/each}
        <p class="font-semibold text-xl">
          Click on the invitation above to continue to the profile creation.
        </p>
      </div>
    </div>
  </div>
{/if}
<div class="hero bg-base-200 py-12">
  <div class="hero-content text-center">
    <div class="max-w-md">
      <h1 class="text-5xl font-bold">Register</h1>
      <p class="py-6">
        You're not yet signed up to Circles. Choose an avatar type that matches
        your needs.
      </p>
    </div>
  </div>
</div>
<div class="hero">
  <div class="hero-content flex-col lg:flex-row">
    <div class="card bg-base-100 w-96 border rounded-lg">
      <figure class="px-10 pt-10">
        <img src="/person.svg" alt="Person" class="w-16 h-16 rounded-xl" />
      </figure>
      <div class="card-body items-center text-center">
        <h2 class="card-title">Person</h2>
        <p>
          As a person, you need to be invited by someone who already uses
          Circles
        </p>
        <div class="card-actions">
          <button class="btn btn-disabled" disabled>Register Human</button>
        </div>
      </div>
    </div>
    <div class="card bg-base-100 w-96 border rounded-lg">
      <figure class="px-10 pt-10">
        <img src="/group.svg" alt="Group" class="w-16 h-16 rounded-xl" />
      </figure>
      <div class="card-body items-center text-center">
        <h2 class="card-title">Group</h2>
        <p>
          Create a group currency that's backed by individual personal Circles
        </p>
        <div class="card-actions">
          <a href="/_new/register/register-group" class="btn btn-primary"
            >Register Group</a
          >
        </div>
      </div>
    </div>

    <div class="card bg-base-100 w-96 border rounded-lg">
      <figure class="px-10 pt-10">
        <img
          src="/organization.svg"
          alt="Organization"
          class="w-16 h-16 rounded-xl"
        />
      </figure>
      <div class="card-body items-center text-center">
        <h2 class="card-title">Organization</h2>
        <p>Register as an organization if you're a business</p>
        <div class="card-actions">
          <a href="/_new/register/register-organization" class="btn btn-primary"
            >Register Organization</a
          >
        </div>
      </div>
    </div>
  </div>
</div>
<div class="hero">
  <div class="hero-content flex-col">
    <div class="collapse">
      <input type="checkbox" />
      <div class="collapse-title text-xl text-center font-medium w-full">
        Advanced
      </div>
      <div class="collapse-content">
        <div class="hero">
          <div class="hero-content flex-col lg:flex-row">
            <div class="card bg-base-100 w-full border rounded-lg">
              <figure class="px-10 pt-10">
                <img
                  src="/person.svg"
                  alt="Person"
                  class="w-16 h-16 rounded-xl"
                />
              </figure>
              <div class="card-body items-center text-center">
                <h2 class="card-title">Person (v1)</h2>
                <p>Register at the Circles v1 hub<br />&nbsp;</p>
                <div class="card-actions">
                  <a
                    href="/_new/register/register-v1-person"
                    class="btn btn-primary">Register v1 Person</a
                  >
                </div>
              </div>
            </div>

            <div class="card bg-base-100 w-full border rounded-lg">
              <figure class="px-10 pt-10">
                <img
                  src="/person.svg"
                  alt="Person"
                  class="w-16 h-16 rounded-xl"
                />
              </figure>
              <div class="card-body items-center text-center">
                <h2 class="card-title">Profile only</h2>
                <p>
                  Create only a profile for the connected address, but no
                  Circles account
                </p>
                <div class="card-actions">
                  <a
                    href="/_new/register/register-profile"
                    class="btn btn-primary"
                  >
                    Register Profile
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full max-w-96 flex-col items-center">
      <p class="text-center">Share your address with Circles users</p>
      <QrCode value={$wallet?.address} />
      <p class="text-xs font-bold text-center">{$wallet?.address}</p>
    </div>
  </div>
</div>
