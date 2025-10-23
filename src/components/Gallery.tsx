/* eslint-disable @next/next/no-img-element */
export function Gallery({ images }: { images: { src: string; alt?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {images.map((img, i) => (
        <img key={i} src={img.src} alt={img.alt ?? ""} className="w-full h-40 object-cover rounded-lg" />
      ))}
    </div>
  );
}

