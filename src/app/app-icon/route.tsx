import { ImageResponse } from "next/og";
import { LOGO_URL } from "@/lib/brand";

/**
 * PNG icons for the installed web app, drawn from the site logo at the exact
 * sizes phones ask for: /app-icon?size=192, ?size=512, ?size=512&maskable=1
 * (extra padding so Android's round/squircle mask doesn't clip the logo).
 */
const SIZES = [180, 192, 512];

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const requested = Number(params.get("size"));
  const size = SIZES.includes(requested) ? requested : 512;
  const maskable = params.get("maskable") === "1";
  const logo = Math.round(size * (maskable ? 0.62 : 0.86));

  // Fetch the logo first so a failed download gives an uncached error
  // instead of a blank icon that phones would keep.
  const res = await fetch(LOGO_URL, { next: { revalidate: 86400 } });
  if (!res.ok) return new Response("Logo unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  const type = res.headers.get("content-type") ?? "image/png";
  const src = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={logo} height={logo} style={{ objectFit: "contain" }} alt="" />
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800" },
    },
  );
}
