import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/*
          viewport-fit=cover: extends layout into the Dynamic Island / notch area
          so the dark background fills the full screen edge-to-edge
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />

        {/* ── iOS PWA ────────────────────────────────────────── */}

        {/* Hides Safari chrome — app runs fullscreen when added to home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/*
          black-translucent: status bar is transparent + overlaps the app.
          Means the app truly fills the entire screen incl. Dynamic Island row.
          The dark bg (#0b0c10) shows through so it looks native.
        */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Label that appears under the icon on the home screen */}
        <meta name="apple-mobile-web-app-title" content="Workout" />

        {/* High-res home screen icon (iOS uses the largest available) */}
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/workout-tracker-1.1/assets/images/pwa-icon-512.png"
        />

        {/*
          Splash screens for common iPhone sizes.
          iOS generates a default from the icon if none match, but explicit
          ones load faster and look sharper.
          iPhone 16 Pro / 17 Pro: 1206×2622 @3x → 402×874pt
        */}
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/workout-tracker-1.1/assets/images/pwa-icon-512.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/workout-tracker-1.1/assets/images/pwa-icon-512.png"
        />
        <link
          rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          href="/workout-tracker-1.1/assets/images/pwa-icon-512.png"
        />

        {/* ── Android Chrome PWA ─────────────────────────────── */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0b0c10" />

        {/* Expo scroll view reset */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{
          __html: `
            *, *::before, *::after {
              box-sizing: border-box;
            }

            html {
              background-color: #0b0c10;
              /* Prevent rubber-band bounce at page edges */
              overscroll-behavior: none;
            }

            body {
              background-color: #0b0c10;
              margin: 0;
              padding: 0;
              overscroll-behavior: none;
              /* Remove blue highlight flash on tap */
              -webkit-tap-highlight-color: transparent;
              /* Disable long-press callout popups */
              -webkit-touch-callout: none;
              /* Prevent accidental text selection during swipe gestures */
              -webkit-user-select: none;
              user-select: none;
            }

            /* Re-enable text selection inside inputs */
            input, textarea {
              -webkit-user-select: text;
              user-select: text;
              /* Remove iOS default styling (rounded inputs, inner shadow) */
              -webkit-appearance: none;
              border-radius: 0;
            }

            /* Removes the 300ms tap delay on older iOS — instant response */
            a, button, [role="button"] {
              touch-action: manipulation;
            }

            /* Smooth momentum scrolling for any scrollable container */
            [data-rn-scrollview], .rn-scrollView {
              -webkit-overflow-scrolling: touch;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
