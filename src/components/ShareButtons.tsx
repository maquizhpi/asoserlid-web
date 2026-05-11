"use client";

type ShareButtonsProps = {
  title: string;
  slug: string;
};

export default function ShareButtons({ title, slug }: ShareButtonsProps) {
  const url =
    typeof window === "undefined"
      ? `https://www.asoserlid.com/blog/${slug}`
      : `${window.location.origin}/blog/${slug}`;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    window.alert("Enlace copiado.");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-bold text-[#173C61]">Compartir publicación</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="rounded-md bg-[#173C61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#218F93]"
        >
          Copiar enlace
        </button>
      </div>
    </div>
  );
}
