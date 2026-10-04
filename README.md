# kitebase-ui

The client side of [Kitebase](https://github.com/kitebase/kitebase): the UI
library, the generic shell that any application can be pointed at, and the
bench the library is developed on.

An application does **not** own a client. It contributes interface through the
`.svelte` files of its plugins, and the shell — compiled for that application —
picks them up. Which is why this is one repository and not one per application:
what varies between applications is their plugins, not their client.

## Layout

```
packages/ui/   the library, @kitebase/ui — components, api client,
                       auth, stack, chrome, i18n, formatters, tabulator
apps/shell/            the generic client: bound to no application, pointed
                       at one at build time. This is the one you ship
apps/playground/          the bench: a client of its own plus the playground,
                       where components are tried before they are relied on
tools/build-app.js     `pnpm build:app` — compile the shell for an application
```

## Using it

```bash
pnpm install
```

Everything below needs one thing: **where the application is**. The shell reads
the rest — plugin roots, API prefix, port — from that application's own
`config.yaml`, so nothing about it is repeated here.

```bash
# development, with hot reload — the app's backend runs separately
KITEBASE_APP_ROOT=/path/to/myapp pnpm --filter shell dev     # localhost:5174

# the compiled client, into the application's static/
pnpm build:app /path/to/myapp
```

The backend has to allow the cross-origin call while the client is on its own
port: start it with `KITEBASE_DEV=1`.

Both of these have a shorter form, from the application's own directory, once
kitebase is installed there:

```bash
kitebase dev              # this app's server and this client, together
kitebase build-client     # the compiled client, into static/
```

They look for this repository beside the kitebase checkout, and take
`$KITEBASE_UI` when it is somewhere else.

## The bench

`apps/playground` is bound to `devtest`, the application that ships inside the
[kitebase](https://github.com/kitebase/kitebase) checkout, and expects to
find it as a sibling of this repository:

```
<workspace>/
  ├── kitebase/            the library, and devtest inside it
  └── kitebase-ui/         this repository
```

Without that, `pnpm dev` says so and stops — the shell is bound to the same
application by default, so point it elsewhere with `KITEBASE_APP_ROOT` and it
runs anywhere.

The playground under `apps/playground/src/routes/playground/` is a laboratory: it
is where a component is tried first, pages there may be stale, and that is not
a defect. What must always work is the library and the shell.

## Working on the library

`packages/ui` is a workspace package, so editing it is live in any
running dev server — nothing to link, nothing to rebuild.

```bash
pnpm test        # vitest
```

## License

MIT — see [LICENSE](LICENSE).
