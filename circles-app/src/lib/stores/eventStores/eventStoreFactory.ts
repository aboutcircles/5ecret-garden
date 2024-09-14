import type {Readable} from 'svelte/store';
import {derived} from 'svelte/store';
import type {CirclesEvent, CirclesEventType, TransactionHistoryRow} from "@circles-sdk/data";
import type {avatar} from "$lib/stores/avatar";

// Type Definitions

/**
 * Event handler function type, resembling a reducer pattern.
 *
 * @template T - The type of data handled by the event.
 * @param {any} event - The incoming event to process.
 * @param {T} currentData - The current data held in the store.
 * @returns {Promise<T>} - The updated data after applying the event.
 */
export type EventHandler<T> = (event: any, currentData: T) => Promise<T>;

/**
 * Function type for the initial data load.
 *
 * @template T - The type of the data to load.
 * @returns {Promise<T>} - A promise resolving to the initial data.
 */
export type LoadFunction<T> = () => Promise<T>;

/**
 * Represents the result of loading the next page of data, including whether pagination has ended.
 *
 * @template T - The type of data being paginated.
 */
export type NextPageData<T> = {
    data: T,
    ended: boolean
};

/**
 * Function type for loading the next page of data.
 *
 * @template T - The type of the data to load.
 * @param {T} currentData - The current state of the data.
 * @returns {Promise<NextPageData<T>>} - A promise resolving to the next page's data and end state.
 */
export type NextPageFunction<T> = (currentData: T) => Promise<NextPageData<T>>;

/**
 * A factory function to create an event-driven Svelte store that handles real-time updates and infinite scrolling.
 * This store uses debouncing to manage incoming events and includes support for sorting data.
 *
 * @template T - The type of data in the store.
 * @param avatarStore - A store representing the avatar instance that manages events and subscriptions.
 * @param eventTypes - A set of event types that the store subscribes to.
 * @param initialLoad - Function to load the initial data when the store is first created.
 * @param handleEvent - Function to handle incoming events and update the store's data.
 * @param handleNextPage - Function to load the next page of data, supporting infinite scrolling.
 * @param initialData - The initial state of the store's data.
 * @param dataComparator - An optional comparator function to sort array-like data.
 * @param debounceDelay - Optional debounce delay (default 50ms) for batching event handling.
 * @returns A Svelte-readable store that holds the data, supports paginated data loading, and updates on events.
 */
export function createEventStore<T>(
    avatarStore: typeof avatar,
    eventTypes: Set<CirclesEventType>,
    initialLoad: LoadFunction<T>,
    handleEvent: EventHandler<T>,
    handleNextPage: NextPageFunction<T>,
    initialData: T,
    dataComparator?: T extends Array<infer U> ? (a: U, b: U) => number : undefined,
    debounceDelay: number = 50
): Readable<{ data: T, next: () => Promise<boolean>, ended: boolean }> {
    let timeout: any;
    let lastEvent: any;
    let finished: boolean = false;
    let storeData: T = initialData; // External variable to store data

    return derived<typeof avatarStore, {
        data: T,
        next: () => Promise<boolean>,
        ended: boolean
    }>(avatarStore, ($avatar, set) => {

        // TODO: The 'initialPromise' feels like a hack to ensure the initial data is loaded before someone calls next()
        let resolveInitialLoad: ((value?: unknown) => void) | undefined = undefined;
        const initialPromise = new Promise((resolve) => resolveInitialLoad = resolve);

        function setData(data: T) {
            storeData = data;

            // Sort the data if a comparator is provided and the data is an array
            if (Array.isArray(storeData) && dataComparator) {
                storeData = storeData.sort(dataComparator);
            }

            set({data: storeData, next: next, ended: finished});
        }

        /**
         * Loads the next page of data by calling `handleNextPage` and updates the store.
         *
         * @returns {Promise<boolean>} - A promise resolving to whether pagination has ended.
         */
        async function next() {
            await initialPromise;
            const {data, ended} = await handleNextPage(storeData);
            finished = ended;
            setData(data);
            return finished;
        }

        setData(storeData); // Initialize the store with the initial data

        if (!$avatar) {
            return;
        }

        /**
         * Processes debounced events and updates the store's data.
         */
        const processEvents = async () => {
            if (!lastEvent) return;

            const data = await handleEvent(lastEvent, storeData);
            setData(data);
            lastEvent = null; // Clear the last event
        };

        /**
         * Handles incoming events by debouncing their processing.
         *
         * @param {CirclesEvent} event - The event to process.
         */
        const eventHandler = (event: CirclesEvent) => {
            if (!eventTypes.has(event.$event)) return;

            lastEvent = event;

            if (timeout) {
                clearTimeout(timeout);
            }

            // Debounce event processing
            timeout = setTimeout(async () => {
                try {
                    await processEvents();
                } catch (e) {
                    console.error(`Failed to update the store on event ${event.$event}`, e);
                }
            }, debounceDelay);
        };

        // Load the initial data and subscribe to events
        initialLoad()
            .then((data) => setData(data))
            .then(() => resolveInitialLoad?.())
            .then(() => $avatar.events.subscribe(eventHandler))
            .catch(e => console.error("Failed to initialize store", e));

        return () => {
            $avatar.unsubscribeFromEvents();
        };
    });
}
