// Shared 1-second clock. One interval for the whole app; countdowns derive from
// it reactively instead of the layout imperatively poking [data-airat] nodes.
import { browser } from '$app/environment';

let current = $state(Math.floor(Date.now() / 1000));

if (browser) setInterval(() => (current = Math.floor(Date.now() / 1000)), 1000);

/** Current epoch seconds, reactive — reading it in a $derived re-runs each tick. */
export const now = () => current;
