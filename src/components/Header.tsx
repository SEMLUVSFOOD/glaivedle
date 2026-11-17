"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./Providers";
import { useDayStreaks } from "./Streaks";

function Item({
  children,
  count,
  selected,
  ...rest
}: { children: React.ReactNode; count?: React.ReactNode; selected?: boolean } & (
  | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
  | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
)) {
  const cls = `nav-link inline-flex items-start rounded-[10px] px-1.5 py-1 no-underline sm:px-2 ${selected ? "pill" : "hoverable"}`;
  const inner = (
    <>
      <span className={rest.href && !selected ? "u" : ""}>{children}</span>
      {count !== undefined && <sup className="caption">[{count}]</sup>}
    </>
  );
  if ("href" in rest && rest.href) {
    return (
      <Link {...(rest as React.ComponentProps<typeof Link>)} className={cls} aria-current={selected ? "page" : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)} className={cls} aria-pressed={selected}>
      {inner}
    </button>
  );
}

export function Header() {
  const { hard, openDialog, dialog, meta } = useApp();
  const path = usePathname();
  return (
    <header className="flex items-start justify-between gap-2 px-[calc(var(--margin)-6px)] pt-[max(14px,env(safe-area-inset-top))] pb-6 sm:pb-12">
      <Link href="/" className="script hoverable -mt-2 px-1.5 text-[54px] leading-[0.8] sm:text-[72px]" aria-label="glaivedle home">
        glaivedle
      </Link>
      <nav className="flex flex-col items-end gap-y-0.5 sm:flex-row sm:items-start sm:gap-x-6" aria-label="Main">
        <Item href="/archive" selected={path === "/archive"} count={meta ? meta.number : undefined}>
          Archive
        </Item>
        <Item onClick={() => openDialog("stats")} selected={dialog === "stats"} count={<HeaderStreak />}>
          Stats
        </Item>
        <Item
          onClick={() => openDialog("settings")}
          selected={dialog === "settings"}
          count={hard ? "hard" : undefined}
          title="Difficulty and display settings"
        >
          Settings
        </Item>
        <Item onClick={() => openDialog("help")} selected={dialog === "help"}>
          Help
        </Item>
      </nav>
    </header>
  );
}

/** Day streak (any daily finished) next to the Stats link. */
function HeaderStreak() {
  const { days } = useDayStreaks();
  return <span title={`${days}-day streak`}>{days}</span>;
}
