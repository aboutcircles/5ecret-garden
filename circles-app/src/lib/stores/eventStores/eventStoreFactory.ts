import type {Readable} from 'svelte/store';
import {derived} from 'svelte/store';
import type {CirclesEvent, CirclesEventType} from "@circles-sdk/data";
import type {avatar} from "$lib/stores/avatar";

// Event handler function type (acts like a reducer)
export type EventHandler<T> = (event: any, currentData: T) => Promise<T>;
// Function type for initial data load
export type InitialLoadFunction<T> = () => Promise<T>;

/**
 * A factory function to create an event-driven store with debounced event handling and reducer-like flexibility.
 *
 * @param avatarStore - The store containing the avatar instance.
 * @param eventTypes - The types of events to subscribe to.
 * @param initialLoad - Function to load the initial data.
 * @param handleEvent - Function to handle each event and update the store.
 * @param initialData - The initial state of the store.
 * @param dataComparator - Optional function to order the elements of the data if data is an array.
 * @param debounceDelay - Delay before processing multiple incoming events (default 50ms).
 * @returns A Svelte store that updates when events occur and loads data initially.
 */
export function createEventStore<T>(
    avatarStore: typeof avatar,
    eventTypes: Set<CirclesEventType>,
    initialLoad: InitialLoadFunction<T>,
    handleEvent: EventHandler<T>,
    initialData: T,
    dataComparator?: T extends Array<infer U> ? (a: U, b: U) => number : undefined, // Comparator for array items
    debounceDelay: number = 50
): Readable<T> {
    let timeout: any;
    let lastEvent: any;
    let storeData: T = initialData; // External variable to store data

    return derived<typeof avatarStore, T>(avatarStore, ($avatar, set) => {
        set(storeData); // Initialize with the current storeData

        if (!$avatar) return;

        const processEvents = async () => {
            if (!lastEvent) return;

            // Call the event handler and set the new result in 'storeData'
            storeData = await handleEvent(lastEvent, storeData);

            // Sort if comparator is provided and the data is an array
            if (Array.isArray(storeData) && dataComparator) {
                storeData = storeData.sort(dataComparator);
            }

            // Update the Svelte store
            set(storeData);

            lastEvent = null; // Reset last event after processing
        };

        const eventHandler = (event: CirclesEvent) => {
            if (!eventTypes.has(event.$event)) return;

            lastEvent = event;

            if (timeout) {
                clearTimeout(timeout);
            }

            // Debounce: wait for debounceDelay before processing
            timeout = setTimeout(async () => {
                try {
                    await processEvents();
                } catch (e) {
                    console.error(`Failed to update the store on event ${event.$event}`, e);
                }
            }, debounceDelay);
        };

        // Load initial data
        initialLoad()
            .then((data) => {
                storeData = data; // Store the initial data in the external variable

                // Sort if the data is an array and comparator is provided
                if (Array.isArray(storeData) && dataComparator) {
                    storeData = storeData.sort(dataComparator);
                }

                // Set the Svelte store with the initial data
                set(storeData);
            })
            .then(() => $avatar.events.subscribe(eventHandler))
            .catch(e => console.error("Failed to initialize store", e));

        return () => {
            $avatar.unsubscribeFromEvents();
        };
    });
}