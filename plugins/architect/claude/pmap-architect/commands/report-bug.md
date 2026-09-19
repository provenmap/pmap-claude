---
category: connect
description: "Account · Draft a bug report with your project details removed, to post in the ProvenMap community or send to support"
argument-hint: "[what went wrong]"
allowed-tools: Bash(node:*)
---

Help the user report a problem with **ProvenMap Architect**. Nothing is sent from here:
you draft the report, and the user reviews and posts it.

## Workflow

1. Gather the environment facts:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-help.js --bug-report
   ```

2. Work out what went wrong: the command argument if given, otherwise the failure earlier in
   this conversation (command, script, exit code, error). If there is neither, ask the user
   what went wrong and wait for the answer.

3. **Read `${CLAUDE_PLUGIN_ROOT}/knowledge/report-bug/SKILL.md` NOW** and draft the report exactly
   as it says: the scenario in generic terms, no names from this project.

4. Check the draft, passing it on stdin:

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-help.js --bug-report --draft <<'PMAP_REPORT'
   <the draft>
   PMAP_REPORT
   ```

   For each entry in `warnings`, rewrite that part in generic terms and check again. Never
   show a draft that still has warnings. If `missingTitle` is true, add the `# title` line.

5. Show the user the final draft in full, then both routes:
   - **Public**: `discussionUrl` opens the post pre-filled in the ProvenMap community on
     GitHub. It is public and indexed; the user reviews and posts it. If `bodyIncluded` is
     false, tell them to paste the body.
   - **Private**: for anything tied to their code, company, or data, open `supportUrl` and
     paste the draft there.

   Say plainly that nothing has been sent.

6. **Outcome:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/pmap-architect.js --brief --command report-bug` → one line, per `${CLAUDE_PLUGIN_ROOT}/knowledge/outcome/SKILL.md`.
