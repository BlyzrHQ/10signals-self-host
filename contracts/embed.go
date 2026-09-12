package contracts

import "embed"

// Files contains the versioned, language-neutral API contracts consumed by the
// web application and the 10Signals CLI.
//
//go:embed *.schema.json
var Files embed.FS
