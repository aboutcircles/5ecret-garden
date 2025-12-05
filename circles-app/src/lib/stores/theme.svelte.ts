import { browser } from '$app/environment';

export type Theme = 'circles-clean' | 'circles-dark';

const STORAGE_KEY = 'circles-theme';
const LIGHT_THEME: Theme = 'circles-clean';
const DARK_THEME: Theme = 'circles-dark';

/**
 * Detects the user's preferred color scheme from the system.
 */
function getSystemPreference(): Theme {
	if (!browser) return LIGHT_THEME;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
}

/**
 * Gets the stored theme from localStorage, falling back to system preference.
 */
function getStoredTheme(): Theme {
	if (!browser) return LIGHT_THEME;
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === LIGHT_THEME || stored === DARK_THEME) {
		return stored;
	}
	return getSystemPreference();
}

/**
 * Applies the theme to the document's HTML element.
 */
function applyTheme(theme: Theme): void {
	if (!browser) return;
	document.documentElement.setAttribute('data-theme', theme);
}

// Reactive state for the current theme
export const themeState = $state<{ current: Theme }>({
	current: browser ? getStoredTheme() : LIGHT_THEME
});

// Store reference for cleanup
let mediaQueryCleanup: (() => void) | null = null;

/**
 * Theme controls for toggling and setting the theme.
 */
export const themeControls = {
	/**
	 * Sets a specific theme.
	 */
	set(theme: Theme): void {
		themeState.current = theme;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, theme);
			applyTheme(theme);
		}
	},

	/**
	 * Toggles between light and dark themes.
	 */
	toggle(): void {
		const newTheme = themeState.current === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
		this.set(newTheme);
	},

	/**
	 * Initializes the theme on mount. Should be called once in the root layout.
	 * Returns a cleanup function to remove the event listener.
	 */
	init(): () => void {
		if (!browser) return () => {};
		const theme = getStoredTheme();
		themeState.current = theme;
		applyTheme(theme);

		// Listen for system preference changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = (e: MediaQueryListEvent) => {
			// Only update if user hasn't explicitly set a preference
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) {
				const newTheme = e.matches ? DARK_THEME : LIGHT_THEME;
				themeState.current = newTheme;
				applyTheme(newTheme);
			}
		};
		mediaQuery.addEventListener('change', handleChange);

		// Store cleanup function
		mediaQueryCleanup = () => {
			mediaQuery.removeEventListener('change', handleChange);
		};

		return mediaQueryCleanup;
	},

	/**
	 * Cleans up event listeners. Call this in onDestroy if needed.
	 */
	destroy(): void {
		if (mediaQueryCleanup) {
			mediaQueryCleanup();
			mediaQueryCleanup = null;
		}
	},

	/**
	 * Returns true if the current theme is dark.
	 */
	isDark(): boolean {
		return themeState.current === DARK_THEME;
	}
};
