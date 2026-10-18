#!/usr/bin/env python3
"""Deduplicate the portrait matchMedia block in RacingGame.tsx."""
path = "/home/z/my-project/src/components/racing/RacingGame.tsx"
src = open(path, encoding="utf-8").read()

block = (
    "  const [portrait, setPortrait] = useState(false);\n"
    "\n"
    "  useEffect(() => {\n"
    '    const mq = window.matchMedia("(orientation: portrait)");\n'
    "    const h = () => setPortrait(mq.matches);\n"
    "    h();\n"
    '    mq.addEventListener("change", h);\n'
    "    return () => mq.removeEventListener(\"change\", h);\n"
    "  }, []);"
)

count = src.count(block)
print("found:", count)
assert count >= 1
# remove all occurrences then re-insert exactly once after muted state line
src = src.replace(block + "\n", "").replace(block, "")
anchor = "  const [muted, setMuted] = useState(false);"
assert anchor in src
src = src.replace(anchor, anchor + "\n" + block, 1)
open(path, "w", encoding="utf-8").write(src)
print("OK - single portrait block restored")
