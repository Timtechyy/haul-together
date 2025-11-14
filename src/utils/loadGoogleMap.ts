let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string) {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject("Google Maps failed to load");

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
