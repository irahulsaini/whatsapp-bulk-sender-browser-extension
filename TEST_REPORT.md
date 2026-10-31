# Migration verification — v1.6.1

- All four browser ZIPs are byte-identical to the previous website downloads.
- Each package's manifest, popup HTML/CSS and sending JavaScript match the supplied source files byte-for-byte.
- Standalone packaging and SHA-256 inventory checks pass for Chrome, Edge, Firefox and Opera.
- Rebuilding into a temporary directory preserves every packaged file's bytes.
- The private original bundle is excluded from the public repository.
- No sending code, permissions or application behavior were modified.
- No extension JavaScript was executed and no messages were sent. Live sending, installed-browser behavior and store approval remain unverified.
