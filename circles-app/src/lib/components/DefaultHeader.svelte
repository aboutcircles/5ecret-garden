<script lang="ts">
  export let text: string | undefined = undefined;
  export let logo: string | undefined = undefined;

  export let homeLink = '/';

  export let menuItems = [
    { name: 'Dashboard', link: '/_new/dashboard' },
    { name: 'Contacts', link: '/_new/contacts' },
    { name: 'Groups', link: '/_new/groups' },
    { name: 'Settings', link: '/settings' },
    { name: 'Tools', link: '/_new/tools' },
  ];

  export let quickActions: {
    name: string;
    link: string;
    icon?: string;
    action?: () => void;
  }[] = [];

  export let activePage: string;
  console.log(activePage);
</script>

<div class="navbar font-dmSans bg-white font-medium border-b fixed top-0 z-10">
  <div class="navbar-start">
    <div class="dropdown">
      <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h8m-8 6h16"
          />
        </svg>
      </div>
      <ul
        class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
      >
        {#each menuItems as item}
          <li>
            <a class="font-medium" tabindex="0" href={item.link}>{item.name}</a>
          </li>
        {/each}
      </ul>
    </div>
    <a class="flex items-center text-xl font-bold" href={homeLink}>
      <img src="/logo.svg" alt="Circles" class="w-8 h-8" />
      <!-- TODO: Handle the sizing and ellipsis for the header text properly. This will do for now. -->
      <span class="inline-block overflow-hidden text-primary"
        >Circles <p class="text-sm text-red-500">(beta)</p></span
      >
    </a>
  </div>
  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal px-1">
      {#each menuItems as item}
        <li>
          <a
            class={item.name === activePage
              ? 'font-bold text-primary'
              : 'font-medium'}
            href={item.link}>{item.name}</a
          >
        </li>
      {/each}
    </ul>
  </div>
  <div class="navbar-end">
    {#if text}
      <button class="hidden md:flex items-center hover:scale-105 transition-transform duration-300" on:click={() => {}}>
        <div class="bg-black/10 rounded-full mr-2 h-7 w-7 p-1">
          {#if logo}
            <img src={logo} alt="Avatar" class="h-full w-full" />
          {/if}
        </div>
        <p class="mr-3 font-medium">{text}</p>
      </button>
    {/if}
    {#each quickActions as action}
      <a
        class="btn btn-primary text-white"
        href={action.link}
        on:click={() => {
          if (action.action) {
            action.action();
          }
        }}
      >
        {#if action.icon}
          <img class="h-3.5 w-3.5" src={action.icon} alt={action.name} />
        {/if}
        {action.name}
      </a>
    {/each}
  </div>
</div>
