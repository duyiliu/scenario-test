# Rust runtime migration (incremental RFC)

Status: proposed, non-breaking. This RFC does not replace the existing Node runtime.

## Objective

Reduce idle memory and startup overhead for the distributed command-line runner and local HTTP proxy, without breaking existing JavaScript scenarios, browser parity, AI Skills, or no-npm project installation.

## Current compatibility constraints

- `src/contract.js` is the single source of truth for the DSL and exported capabilities (contractVersion 8 at time of writing).
- `src/cli.js` implements `run`, `serve`, `doctor`, `init` and other CLI behavior.
- The browser workbench uses the JS runtime; Node and browser must execute equivalent scenarios.
- `scenario.config.js`, scenario modules and optional `plugins/` are executable JavaScript, not pure JSON. Rust cannot load them without an embedded JS engine or an external Node compatibility process.
- Installer copies versioned runtime artifacts into each business project without touching its package dependencies.

## Target boundary

1. **Rust native executable (optional initially):** HTTP transport, retries, timeouts, local static/proxy server, result capture, limited memory bookkeeping.
2. **JavaScript compatibility process:** loads existing configs/scenarios/plugins, validates against the current contract, and optionally executes unsupported JS behavior.
3. **Browser runtime:** remains JavaScript; preserve workbench appearance, user interaction and contracts.
4. **Normalized execution interchange:** versioned JSON input/output between JS and Rust, with strict validation and deterministic data types. Do not serialize JS closures/functions.

Do not maintain independently hand-written Rust and JS copies of the DSL schema: derive generated Rust types/tests from a published machine-readable contract.

## Recommended milestones

### M0 — Baseline and compatibility corpus

- Benchmark Node idle CLI, serve idle RSS, 1/10/100 sequential requests, retry-heavy cases, proxy uploads, and startup time on Windows and Linux.
- Capture golden fixtures: config loading, substitution, extraction, assertion operators, conditional/manual steps, retries, uploads, saved responses, and plugin hooks.
- Record behavior of the browser run for the same fixtures, including error shapes and skip semantics.
- Make parity checks a mandatory CI gate.

### M1 — Rust transport experiment (no installer change)

- Add `crates/scenario-test-native` and build Windows/Linux/macOS binaries.
- Implement a JSON-lines protocol over stdin/stdout with one request / response per message, correlation IDs, errors, timeouts, max body size, and cancellation.
- Node stays in charge of parsing `scenario.config.js` and JS plugins; it can invoke Rust transport only when explicitly opted in.
- Benchmark native transport and end-to-end process total RSS; count the memory of both processes.

### M2 — Move local proxy / server

- Introduce an opt-in Rust `serve` implementation matching existing proxy behavior, bind address, response/body constraints, TLS, security and shutdown semantics.
- Preserve the browser workbench and static assets.
- Compare output with existing Node serve tests.

### M3 — Native runner only where safe

- Introduce a strictly declarative scenario representation that excludes executable JavaScript.
- Native runner can execute only validated declarative scenarios. Existing JS config/scenarios/plugins continue through Node.
- Require exact result parity for assertions, template interpolation, retries, redaction and error reporting.

### M4 — Distribution and cutover

- Ship native binaries alongside the existing `.cjs` runner. Do not change the default until proven parity.
- Update installation scripts for target platform/architecture detection, SHA256 signatures/hashes, rollback and offline source support.
- Preserve `doctor`, AI prompt, version lock and capability output semantics.
- Retain the Node compatibility path for projects with JavaScript extensions.

## Non-goals

- Rewriting the browser UI in Rust.
- Removing JavaScript plugin support without a published migration path.
- Renaming DSL fields or changing existing scenario behavior as part of a performance migration.
- Claiming a memory improvement based only on the Rust child process while Node remains resident.

## Acceptance criteria

- Existing `npm run check:all` remains green.
- All golden tests and browser/CLI equivalence tests pass.
- Installation and upgrade do not change business project dependencies or overwrite user-owned scenarios/config.
- Rust mode can be disabled with a single opt-out and has no behaviorally observable differences on supported declarative fixtures.
- Benchmark report shows peak RSS, idle RSS, p95 latency and startup time for the **whole process tree**, with test environment and repeat counts documented.
- Default cutover requires a reviewer-approved report, not a fixed speculative percentage target.

## Open design decision

Executable JavaScript DSL vs JSON-only declarative DSL is a product compatibility decision. Until explicitly approved, keep JavaScript as the compatibility format, and make Rust an opt-in acceleration layer rather than a forced replacement.
