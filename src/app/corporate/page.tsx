import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "WAWAGO | WhatsApp CRM for growing teams" },
  description: "Bring customer conversations, campaigns, and commerce into one WhatsApp-first workspace.",
  openGraph: {
    title: "WAWAGO | WhatsApp CRM for growing teams",
    description: "Bring customer conversations, campaigns, and commerce into one WhatsApp-first workspace.",
    type: "website",
  },
};

const capabilities = [
  {
    icon: MessageCircle,
    title: "A focused team inbox",
    text: "Keep every customer conversation in one place, with the context your team needs to respond well.",
  },
  {
    icon: Sparkles,
    title: "Campaigns that feel personal",
    text: "Build approved WhatsApp campaigns and connect them to the audiences that matter.",
  },
  {
    icon: ShieldCheck,
    title: "Built for operations",
    text: "Manage templates, numbers, customer records, and commerce without jumping between tools.",
  },
];

export default function CorporatePage() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#f6f3ea] font-[family-name:var(--font-inter)] text-[#14251f]">
      <section className="relative border-b border-[#14251f]/15 bg-[#dff1dc]">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] overflow-hidden lg:block" aria-hidden="true">
          <div className="absolute inset-0 bg-[#1e6046]" />
          <div className="absolute -right-28 top-[-18%] size-[34rem] rounded-full border-[52px] border-[#b8e2b5]" />
          <div className="absolute bottom-[-16rem] left-[-7rem] size-[29rem] rounded-full border-[40px] border-[#f5cd74]" />
          <Image
            src="/logo-white-flat.png?v=2"
            alt=""
            width={144}
            height={144}
            className="absolute bottom-14 right-16 size-36 opacity-90"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-6 sm:px-10 lg:px-14">
          <header className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3" aria-label="WAWAGO home">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#14251f]">
                <Image src="/logo-white-flat.png?v=2" alt="" width={24} height={24} className="size-6" />
              </span>
              <span className="text-base font-bold tracking-[0.12em]">WAWAGO</span>
            </Link>
            <a
              href="https://portal.wawago.app/login"
              className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
            >
              Sign in <ArrowUpRight className="size-4" />
            </a>
          </header>

          <div className="grid min-h-[37rem] items-end py-20 lg:grid-cols-[54%_46%] lg:py-28">
            <div className="max-w-3xl">
              <p className="mb-6 text-sm font-bold tracking-[0.14em] text-[#236648] uppercase">WhatsApp CRM</p>
              <h1 className="font-[family-name:var(--font-playfair-display)] text-5xl leading-[1.03] sm:text-6xl lg:text-7xl">
                Customer conversations, made more human.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#284638]">
                WAWAGO gives growing teams a calmer way to manage WhatsApp conversations, campaigns, and commerce.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="https://portal.wawago.app/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[#14251f] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  Open WAWAGO <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
            <div className="mt-12 flex justify-end lg:mt-0 lg:hidden" aria-hidden="true">
              <div className="relative flex aspect-square w-72 items-center justify-center overflow-hidden rounded-full bg-[#1e6046]">
                <div className="absolute size-56 rounded-full border-[28px] border-[#b8e2b5]" />
                <Image src="/logo-white-flat.png?v=2" alt="" width={80} height={80} className="relative size-20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-14 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.14em] text-[#b3542f] uppercase">The work, together</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">Everything your customer team needs to stay in the conversation.</h2>
        </div>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, text }) => (
            <article key={title} className="border-t-2 border-[#14251f] pt-5">
              <Icon className="size-6 text-[#b3542f]" />
              <h3 className="mt-8 text-xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-[#50625a]">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#14251f]/15 bg-[#14251f] text-[#f6f3ea]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-14">
          <span className="font-bold tracking-[0.12em]">WAWAGO</span>
          <span className="text-[#b9c8bf]">WhatsApp CRM for teams that care about every reply.</span>
        </div>
      </footer>
    </main>
  );
}