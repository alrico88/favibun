import { Elysia, t } from "elysia";
import { useFavicon } from "./libs/useFavicon";
import { mimes, lookup } from "mrmime";
import { withQuery } from "ufo";
import { swagger } from "@elysiajs/swagger";
import { Unit, convertToMilliseconds } from "espera";
import { rateLimit } from "elysia-rate-limit";

const app = new Elysia()
  .use(swagger())
  .use(
    rateLimit({
      duration: convertToMilliseconds(1, Unit.minutes),
      max: Number(process.env.REQUESTS_PER_MIN ?? 200),
      countFailedRequest: true,
    }),
  )
  .onBeforeHandle((c) => {
    c.set.headers["Cache-Control"] = `max-age=${convertToMilliseconds(
      1,
      Unit.days,
    )}`;
  })
  .get(
    "/generic",
    async (c) => {
      const { url } = c.query;

      const { loadFavicon, getDefaultFavicon } = useFavicon();

      const favicon = await loadFavicon(getDefaultFavicon(url as string));

      c.set.headers["Content-Type"] = mimes.png;

      return new Response(favicon);
    },
    {
      query: t.Object({
        url: t.String(),
      }),
      response: t.Any(),
    },
  )
  .get(
    "/image",
    async (c) => {
      const { loadFavicon, resolveFavicon } = useFavicon();

      const { url } = c.query;
      try {
        const faviconUrl = await resolveFavicon(url as string);

        const favicon = await loadFavicon(faviconUrl);

        mimes.ico = "image/x-icon";

        const mime = lookup(faviconUrl);

        c.set.headers["Content-Type"] = mime || mimes.png;

        return new Response(favicon);
      } catch {
        c.set.redirect = withQuery("/generic", {
          url,
        });
      }
    },
    {
      query: t.Object({
        url: t.String(),
      }),
      response: t.Any(),
    },
  )
  .get(
    "/raw",
    async (c) => {
      const { resolveFavicon } = useFavicon();

      const { url } = c.query;

      return resolveFavicon(url as string);
    },
    {
      query: t.Object({
        url: t.String(),
      }),
      response: t.String(),
    },
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
