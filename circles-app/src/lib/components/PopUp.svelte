<script context="module" lang="ts">
    import {writable} from 'svelte/store';
    import type {SvelteComponent} from "svelte";

    export type PopupControls = {
        close: (() => void) | null;
        open: ((content: PopupContentDefinition) => void) | null;
    };

    export type PopupContentDefinition = {
        component: typeof SvelteComponent;
        props: Record<string, any>;
    };

    export const popupControls = writable<PopupControls>({
        close: null,
        open: null
    });

</script>
<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import {tweened} from 'svelte/motion';
    import {expoOut} from 'svelte/easing';

    const dispatch = createEventDispatcher();

    let initialY: number;
    let lastY: number;
    let currentY: number;
    let lastTime: number;
    let velocity: number = 0;
    let popupHeight: number = 4096;

    let popupContent: PopupContentDefinition | undefined;

    const y = tweened(popupHeight, {duration: 300, easing: expoOut});

    $: {
        let opacityValue = 1 - ($y / popupHeight);
        opacityValue = opacityValue < 0 ? 0 : opacityValue > 1 ? 1 : opacityValue;  // Clamping the value between 0 and 1
        dispatch('overlayOpacity', {opacity: opacityValue});
    }

    let popup: HTMLDivElement;

    $popupControls.open = (content: PopupContentDefinition | undefined) => {
        if (!content) {
            $popupControls?.close?.();
            return;
        }

        popupContent = content;
        dispatch('openingStart'); // Event when opening starts
        y.set(0, {duration: 300, easing: expoOut}).then(() => {
            dispatch('openingComplete'); // Event when opening completes
        });
    };

    $popupControls.close = async () => {
        popupHeight = popup.offsetHeight;
        await y.set(popupHeight, {duration: 300, easing: expoOut});
        dispatch('close');
    };

    const handleStart = (event: MouseEvent | TouchEvent) => {
        event.preventDefault();
        initialY = lastY = currentY = getY(event);
        lastTime = performance.now();
        popupHeight = popup.offsetHeight;
        startVelocityTracking();

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove);
        document.addEventListener('touchend', handleEnd);
    };

    const handleMove = (event: MouseEvent | TouchEvent) => {
        currentY = getY(event);
        const deltaY = currentY - initialY;
        y.set(deltaY > 0 ? deltaY : 0, {duration: 0});  // Update position without animation
    };

    const handleEnd = () => {
        stopVelocityTracking();
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);

        if (velocity > 0.05) {
            y.set(popupHeight, {duration: 300, easing: expoOut}).then(() => {
                dispatch('close');
            });
        } else {
            y.set(0, {duration: 300, easing: expoOut});
        }
    };

    let velocityInterval: NodeJS.Timeout;
    const startVelocityTracking = () => {
        velocityInterval = setInterval(() => {
            const now = performance.now();
            velocity = (currentY - lastY) / (now - lastTime);
            lastY = currentY;
            lastTime = now;
        }, 50);  // Update velocity every 50ms
    };

    const stopVelocityTracking = () => {
        clearInterval(velocityInterval);
    };

    const getY = (event: MouseEvent | TouchEvent) => {
        return event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    };
</script>
<style>
    .popup {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        background-color: white;
        border-top: 5px solid #ccc;
        z-index: 2; /* Ensure popup is above overlay */
        transform: translateY(var(--y)); /* use the CSS variable to set the position */
    }

    .pull-bar {
        width: 100%;
        height: 40px;
        background-color: #ccc;
        cursor: pointer;
    }

    .content {
        overflow-y: auto;
        flex-grow: 1;
    }

    .action-bar {
        display: flex;
        justify-content: space-around;
        padding: 10px;
        background-color: #f9f9f9;
        border-top: 1px solid #ccc;
    }
</style>

<div class="popup" bind:this={popup} style="--y: { $y }px">
    <div class="pull-bar" on:mousedown={handleStart} on:touchstart={handleStart}></div>
    <div class="content">
        <!--        Lorem ipsum dolor-->
        {#if popupContent}
            <svelte:component this={popupContent.component} {...popupContent.props}/>
        {/if}
    </div>
    <!--    <div class="action-bar">-->
    <!--        <button>&lt; Previous</button>-->
    <!--        <button>Next &gt;</button>-->
    <!--    </div>-->
</div>
