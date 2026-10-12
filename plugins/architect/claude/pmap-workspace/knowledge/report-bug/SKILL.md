---
name: report-bug
user-invokable: false
description: How to draft a ProvenMap bug report that describes the problem without naming the user's project. Use at /report-bug's drafting step. Covers what to keep (the scenario), what never goes in (the user's names and content), the report template, and how to generalise a failure.
metadata:
  author: ProvenMap
  version: 1.0.0
---

# Drafting a bug report

The report may be posted in a **public, indexed** forum. It has to tell ProvenMap enough to
reproduce the problem while saying nothing about the user's project. Keep the **scenario**:
what kind of thing was being done, what the plugin did, and what went wrong. Drop the
**domain**: what the user's project is, what it's called, and what it contains.

## Never in the draft

- Names from the user's project: repository, folders, files, modules, classes, functions,
  services, board and node names, org or workspace names, branch names.
- Paths, hostnames, URLs other than provenmap.com, e-mail addresses, tokens, IDs, hashes.
- Source code, document text, board descriptions, insight or work item text, or error
  messages that quote any of those.
- What the product or company does ("a payments reconciliation service" is domain knowledge).

## Keep, in generic terms

- The command that failed and its flags, the script and its exit code, the error class, and
  the **plugin's own** message with the user's names replaced by placeholders.
- The **shape** that triggered it: languages, build tool, monorepo vs single app, rough
  counts ("~400 files, 3 languages, 12 boards"), the step or gate that fired (`A-EDGE-HIER`).
- What the user expected instead.

Generalise with placeholders, never with invented detail: `service-a imports module-b across
a workspace boundary`, `<file>`, `<board>`. When a failure can't be described without the
user's names, keep the generic part and say that the full details are available on request
through private support.

## Template

```markdown
# <command>: <one-line symptom, no project names>

**What happened**
<two or three sentences: what was being done, what the plugin did>

**Expected**
<one sentence>

**Steps / shape**
- <the command and flags, in order>
- <the project shape that matters>

**Error**
<the exit code and the plugin's message, with names replaced by placeholders>

**Environment**
<plugin> <version> · <host> · <os> · Node <node>
```

The first line must be the `# title`: the check script turns it into the discussion title.
Put the environment line in exactly as the facts give it. Leave out any section you have
nothing true for; never pad it.
