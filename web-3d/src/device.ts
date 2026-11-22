/**
 * Phone or not is decided by the DEVICE, not the window width: a touch screen whose physical screen is phone-sized
 * gets the phone layout (bottom sheets, swiping) also in landscape, with "Desktop site" turned on, or on big phones.
 * Laptops, desktops and tablets keep the wide layout. Marked as <html data-phone>, which the `sm:` / `max-sm:`
 * variants in index.css respect.
 */
export const isPhoneDevice = (() => {
  try {
    const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const small = Math.min(window.screen.width, window.screen.height) <= 600; // CSS px of the screen itself
    return touch && small;
  } catch {
    return false;
  }
})();

if (isPhoneDevice) document.documentElement.dataset.phone = '1';

/** Phone layout right now: a phone device, or any narrow window. */
export const phoneLayout = () => isPhoneDevice || !window.matchMedia('(min-width: 640px)').matches;
