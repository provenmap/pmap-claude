# Scheduling — `/monitor setup`

`use-cases.md` holds the watches, the config shape and the custom-watch sequence; read it first.

1. **Pick the watches.** With no text after `setup`: ask (AskUserQuestion, one question,
   multi-select) which watches to add — the catalogue's use cases, each with its source, plus
   "Something else". With text after `setup` (`/monitor setup stripe disputes by product`), or
   when the user picks "Something else", follow *A custom watch* in `use-cases.md`: draft, dry
   run, and save only when the **user** confirms.
2. **Write `.provenmap/monitoring/config.json`** in the shape `use-cases.md` gives. Keep the
   watches already in the file; a watch picked again replaces the one with its `id`. A catalogue
   watch gets its default `stat` from `use-cases.md` written with it, without a question (cloud
   cost takes the currency of the bill); only a custom watch asks for its stat. Ask for a
   watch's `scope` only when the source cannot answer it (a Sentry account with one project
   needs no question).
3. **For each new watch's source**, print the connect line and auth note from
   `vendor-recipes.md`. Never ask the user to paste a token into the chat — name the env var and
   where to set it.
4. **Scheduling** — do not describe a surface here. The config file you just wrote puts
   `/monitor --scheduled` into the task `/start` prints for this repo when nothing runs on a
   schedule (one task per repo, every command it needs, the sentence to paste); a repo that
   already has a task adds `Then run /pmap-code:monitor --scheduled.` to its instructions.
   One sentence covers every watch: a run pulls them all. For a cloud routine,
   `${CLAUDE_PLUGIN_ROOT}/knowledge/provenmap-integration/references/recurring-runs.md` §2 has the
   prompt and the environment it needs.
5. Finish by naming the next command: "Run `/monitor` now for a first pass."
