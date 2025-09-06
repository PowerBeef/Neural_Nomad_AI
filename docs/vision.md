# Vision setup and troubleshooting

Multimodal sessions require pairing the base model with a matching `.mmproj` projector file. Verify the projector path and extension before starting a vision session.

- `ctx_shift` **must be `false`** for any multimodal session.
- Downscale imported images so the longest edge is at most **336px** before encoding.
- On Android the `use_gpu` flag is accepted but currently runs on CPU; GPU acceleration will be enabled in future releases.

Use the local healthcheck to validate projector support and log any warnings returned.
