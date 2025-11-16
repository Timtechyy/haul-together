// imageWorker.ts
self.onmessage = async (e: MessageEvent) => {
  const file: File = e.data;

  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = () => {
    const result = reader.result as string;
    const base64 = result.split(",")[1];
    const mimeType = file.type;

    // Return the converted file
    self.postMessage({ base64, mimeType });
  };

  reader.onerror = (err) => {
    self.postMessage({ error: err });
  };
};
