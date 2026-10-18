#!/usr/bin/env python3
"""Fix rotate-hint overlay: CSS class -> JS matchMedia controlled rendering."""
import re

path = "/home/z/my-project/src/components/racing/RacingGame.tsx"
src = open(path, encoding="utf-8").read()

# 1) add portrait state after muted state
old_state = "  const [muted, setMuted] = useState(false);"
new_state = (
    "  const [muted, setMuted] = useState(false);\n"
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
assert old_state in src, "state anchor not found"
src = src.replace(old_state, new_state, 1)

# 2) wrap overlay with {portrait && (...)} using regex across the block
pattern = re.compile(
    r'\{/\* rotate-device overlay \*/\}\s*\n\s*<div className="rotate-hint ([^"]*)">'
    r"(.*?)"          # inner content (non-greedy, DOTALL)
    r"</div>",
    re.DOTALL,
)
m = pattern.search(src)
assert m, "rotate overlay block not found"
cls = m.group(1).replace("rotate-hint ", "")
inner = m.group(2)
replacement = (
    "{/* rotate-device overlay */}\n"
    "      {portrait && (\n"
    f'        <div className="{cls}">'
    f"{inner}</div>\n"
    "      )}"
)
src = src[: m.start()] + replacement + src[m.end():]

open(path, "w", encoding="utf-8").write(src)
print("OK - rotate overlay now JS-controlled")
