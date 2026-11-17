# Array comparison analytics

| Event | Trigger | Parameters added for array comparison |
| --- | --- | --- |
| `array_comparison_change` | User selects a different mode | `array_comparison` (new mode), `previous_array_comparison` (old mode) |
| `compare_click` | User clicks Compare, before input validation | `array_comparison` (selected mode) |
| `compare_completed` | Comparison successfully finishes | `array_comparison` (mode used for the result) |

Mode values are `semantic` (automatic alignment) and `position` (compare by position), independent of interface language. Existing event names and parameters remain unchanged. Restoring a saved preference or clicking the already selected radio does not emit a change event. Compare events include the current mode even when the user keeps the default or restores a preference without changing it. Input contents are not included in these parameters.

To break down events by mode in GA4 reports and explorations, register an **event-scoped custom dimension** for the event parameter `array_comparison`. Optionally register `previous_array_comparison` to inspect transitions. These definitions must be configured in the GA4 property; deploying the code does not create them. See [Google's instructions for event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696?hl=en).

Localhost uses the analytics wrapper's debug logging rather than sending events to GA4. Tests verify the event payloads at that wrapper boundary.
