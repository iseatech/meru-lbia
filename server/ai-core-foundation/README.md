# AI CORE Foundation (Phase 1)

This isolated module provides a Phase 1 baseline for AI CORE runtime primitives:

- Typed event contracts (`events/event-types.ts`)
- Lightweight async event bus (`events/event-bus.ts`)
- Trace context generation and propagation (`trace/trace-context.ts`)
- Phase lifecycle event publishing helpers (`trace/phase-lifecycle.ts`)
- Learning signal capture (`learning/learning-capture.ts`)
- Auditor bootstrap event helper (`auditor/auditor-bootstrap.ts`)
- Runtime health probing and publication (`runtime/health-probe.ts`)
- Unified export surface (`index.ts`)

## Design goals

1. **Isolation**: no cross-module dependencies outside this folder.
2. **Composability**: all primitives are small and dependency-light.
3. **Type safety**: strict event interfaces for predictable integration.
4. **Observability-first**: lifecycle, learning, audit, and health are all evented.

## Next steps

- Add persistence adapters for emitted events.
- Add OpenTelemetry bridging for trace context.
- Add policy hooks for auditor enforcement mode.
