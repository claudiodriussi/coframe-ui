# coframe-ui

The client side of [Coframe](https://github.com/claudiodriussi/coframe): the UI
library, the generic shell that any application can be pointed at, and the
bench the library is developed on.

An application does **not** own a client. It contributes interface through the
`.svelte` files of its plugins, and the shell — compiled for that application —
picks them up. Which is why this is one repository and not one per application:
what varies between applications is their plugins, not their client.

## Layout

```
packages/coframe-ui/   the library, @coframe/ui — components, api client,
                       auth, stack, chrome, i18n, formatters, tabulator
apps/shell/            the generic client: bound to no application, pointed
                       at one at build time. This is the one you ship
apps/devtest/          the bench: a client of its own plus the playground,
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
COFRAME_APP_ROOT=/path/to/myapp pnpm --filter shell dev     # localhost:5174

# the compiled client, into the application's static/
pnpm build:app /path/to/myapp
```

The backend has to allow the cross-origin call while the client is on its own
port: start it with `COFRAME_DEV=1`.

Both of these have a shorter form, from the application's own directory, once
coframe is installed there:

```bash
coframe dev              # this app's server and this client, together
coframe build-client     # the compiled client, into static/
```

They look for this repository beside the coframe checkout, and take
`$COFRAME_UI` when it is somewhere else.

## The bench

`apps/devtest` is bound to `devtest`, the application that ships inside the
[coframe](https://github.com/claudiodriussi/coframe) checkout, and expects to
find it as a sibling of this repository:

```
<workspace>/
  ├── coframe/            the library, and devtest inside it
  └── coframe-ui/         this repository
```

Without that, `pnpm dev` says so and stops — the shell is bound to the same
application by default, so point it elsewhere with `COFRAME_APP_ROOT` and it
runs anywhere.

The playground under `apps/devtest/src/routes/playground/` is a laboratory: it
is where a component is tried first, pages there may be stale, and that is not
a defect. What must always work is the library and the shell.

## Working on the library

`packages/coframe-ui` is a workspace package, so editing it is live in any
running dev server — nothing to link, nothing to rebuild.

```bash
pnpm test        # vitest
```

## License

MIT — see [LICENSE](LICENSE).
