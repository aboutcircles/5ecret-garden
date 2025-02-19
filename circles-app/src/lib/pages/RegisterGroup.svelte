<script lang="ts">
  import CreateGroupForm from '$lib/components/CreateGroupForm.svelte';

  type Step = 'start' | 'form' | 'executed' | 'error';
  let step: Step = 'start';

  function handleStepChange(event: CustomEvent<Step>) {
    step = event.detail;
  }
</script>

<div
  class="w-full flex flex-col items-center justify-center gap-y-8 md:gap-y-4 rounded-xl px-2 sm:px-10 border py-4 sm:py-8"
>
  {#if step === 'start'}
    <p class="text-2xl md:text-3xl text-center font-bold pt-10">
      Welcome to Circles Group Management
    </p>
    <p class="text-gray-900 text-center">
      Create a group for you and your community
    </p>
    <button
      type="button"
      class="btn btn-sm btn-primary"
      on:click={() => (step = 'form')}
    >
      Get Started
    </button>
  {:else if step === 'form'}
    <CreateGroupForm on:stepChange={handleStepChange} />
  {:else if step === 'executed'}
    <div class="w-full flex flex-col items-center">
      <div class="flex items-center">
        <img src="/check.svg" alt="check icon" class="h-5 w-5" /> Your group was
        sucessfully created !
      </div>
      <a
        class="text-accent flex items-center px-4 py-1 rounded-full mt-4 text-base font-semibold"
        href={'/setting'}
      >
        View group
      </a>
    </div>
  {:else if step === 'error'}
    <div class="text-gray-900 w-full flex flex-col items-center">
      <div class="flex items-center">
        <img src="/x-mark.svg" alt="x mark icon" class="h-5 w-5" /> Something
        went wrong with your transaction, try again or contact the support
        <a
          href="https://www.aboutcircles.com/community"
          target="_blank"
          class="text-accent underline ml-1"
        >
          here
        </a>
        .
      </div>
      <button
        class="text-[#DD7143] flex items-center px-4 py-1 rounded-full mt-4 text-base font-semibold"
        on:click={() => (step = 'start')}
      >
        Back <img
          src="/arrow-uturn-left.svg"
          alt="arrow uturn left icon"
          class="h-4 w-4 ml-2"
        />
      </button>
    </div>
  {/if}
</div>
