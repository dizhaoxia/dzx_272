export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const filesToBase64 = async (files: FileList | File[]): Promise<string[]> => {
  const list = Array.from(files);
  return Promise.all(list.map(fileToBase64));
};
