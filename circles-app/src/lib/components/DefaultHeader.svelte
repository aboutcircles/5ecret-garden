<script lang="ts">
    export let text = "Circles";
    export let logo = "/logo.svg";

    export let homeLink = "/";

    export let menuItems = [
        {name: "Dashboard", link: "/_new/dashboard"},
        {name: "Contacts", link: "/contacts"},
        {name: "Groups", link: "/groups"},
        {name: "Settings", link: "/settings"},
    ];

    export let quickActions: {
        name: string;
        link: string;
        icon?: string;
        action?: () => void;
    }[] = [];
</script>

<div class="navbar font-dmSans">
    <div class="navbar-start">
        <div class="dropdown">
            <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"/>
                </svg>
            </div>
            <ul
                class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
                {#each menuItems as item}
                    <li>
                        <a tabindex="0" href={item.link}>{item.name}</a>
                    </li>
                {/each}
            </ul>
        </div>
        <a class="btn btn-ghost text-xl" href={homeLink}>
            <img src={logo} alt="User Icon" class="w-8 h-8 rounded-full">
            <!-- TODO: Handle the sizing and ellipsis for the header text properly. This will do for now. -->
            <span class="inline-block overflow-hidden max-w-[7em] md:max-w-full">{text}</span>
        </a>
    </div>
    <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal px-1">
            {#each menuItems as item}
                <li>
                    <a href={item.link}>{item.name}</a>
                </li>
            {/each}
        </ul>
    </div>
    <div class="navbar-end">
        {#each quickActions as action}
            <a class="btn mr-2" href={action.link}
               on:click={() => {
                if (action.action) {
                    action.action();
                }
            }}>
                {#if action.icon}
                    <img class="h-6 w-6" src={action.icon} alt={action.name}/>
                {/if}
                {action.name}
            </a>
        {/each}
    </div>
</div>