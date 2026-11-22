# Demo scenarios

Use a scenario when the real system can't be shown (customer data, internal
services) or when a public sample tells the story better.

## Choosing a sample

- Public, permissive license (MIT, Apache-2.0). A repo with **no license** is
  all rights reserved — don't use it.
- A real cross-service dependency, so two teams have distinct ownership.
- Small enough that the product answers quickly; active is nice, archived is OK.
- Avoid AGPL and competitor-branded samples for company videos.

| Sample | License | Teams / story |
|---|---|---|
| `dotnet/eShop` | MIT | Ordering ↔ Payment over RabbitMQ events: orders stuck after stock is confirmed, no payment result |
| `microservices-demo/orders` + `/payment` (Sock Shop) | Apache-2.0, archived | Separate repos; order calls payment |
| `open-telemetry/opentelemetry-dotnet` + `opentelemetry-collector` | Apache-2.0 | App team ↔ telemetry platform: traces stopped arriving |
| `prometheus/prometheus` + `alertmanager` | Apache-2.0 | Alerts firing but nobody paged (large repos, slow) |

## Splitting one repo between two teams

Give each team folders it owns and a verified hand-off between them. In
`dotnet/eShop`: Ordering owns `src/Ordering.*` and `src/OrderProcessor`;
Payment owns `src/PaymentProcessor`. Ordering publishes a stock-confirmed
event; PaymentProcessor publishes payment succeeded/failed; Ordering marks an
order paid only after that result. Real weaknesses make good findings (for
example, handler exceptions acknowledged and dropped with no dead-letter
queue). Verify every such fact against the repo before scripting it.

## Scenario rules

- Frame it on screen and in narration: "a simulated incident on eShop, a
  sample store".
- Keep prompts short and natural; rules about what to say or omit belong in
  the product's configuration, not the on-camera prompt.
- Verify every claimed code fact against the repo before scripting it.
- Remove unrelated data sources (repos, projects) from the demo setup so the
  product doesn't search the wrong material.
