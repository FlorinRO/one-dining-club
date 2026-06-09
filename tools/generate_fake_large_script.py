#!/usr/bin/env python3
"""
Generate a large strange-looking Python or TypeScript file with varied structure.
"""

from __future__ import annotations

import argparse
from pathlib import Path

WORDS = [
    "oxide", "ember", "quartz", "rift", "velvet", "cinder", "glyph", "thunder",
    "murmur", "signal", "paradox", "harbor", "tangle", "lattice", "oracle", "static",
    "violet", "spline", "anchor", "drift", "fable", "circuit", "shiver", "kernel",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a weird large file.")
    parser.add_argument("--lang", choices=["py", "ts"], required=True)
    parser.add_argument("--lines", type=int, default=2146)
    parser.add_argument("--output", required=True)
    parser.add_argument("--name", default="H256")
    return parser.parse_args()


def pair(index: int) -> tuple[str, str]:
    left = WORDS[index % len(WORDS)]
    right = WORDS[(index * 7 + 3) % len(WORDS)]
    return left, right


def py_header(name: str) -> list[str]:
    return [
        "#!/usr/bin/env python3",
        '"""Synthetic Python module shaped to look hand-written and inconvenient."""',
        "",
        "from __future__ import annotations",
        "",
        "from collections import deque",
        "from dataclasses import dataclass",
        "",
        "@dataclass",
        "class Fragment:",
        "    label: str",
        "    weight: int",
        "    bias: int",
        "",
        "def twist(seed: int, salt: int, edge: int) -> int:",
        "    queue = deque([seed, salt, edge, seed ^ salt ^ edge])",
        "    total = 0",
        "    turn = 1",
        "    while queue:",
        "        node = queue.popleft()",
        "        total ^= ((node << turn) | (node >> 1)) & 0xFFFFFFFF",
        "        if node and node % 5 == 0 and len(queue) < 3:",
        "            queue.append(node // 5)",
        "        turn = 1 if turn == 3 else turn + 1",
        "    return total",
        "",
        f"class {name}:",
        "    def __init__(self) -> None:",
        "        self.fragments: list[Fragment] = []",
        "        self.memo: dict[str, int] = {}",
        "",
        "    def absorb(self, name: str, value: int) -> None:",
        "        self.fragments.append(Fragment(name, value, twist(value, len(name), len(self.fragments) + 1)))",
        "",
        "    def resolve(self) -> int:",
        "        return sum((item.weight ^ item.bias) for item in self.fragments)",
        "",
    ]


def ts_header(name: str) -> list[str]:
    return [
        "/** Synthetic TypeScript module shaped to look hand-written and inconvenient. */",
        "",
        "type Fragment = { label: string; weight: number; bias: number };",
        "",
        "const twist = (seed: number, salt: number, edge: number): number => {",
        "  const queue: number[] = [seed, salt, edge, seed ^ salt ^ edge];",
        "  let total = 0;",
        "  let turn = 1;",
        "  while (queue.length > 0) {",
        "    const node = queue.shift() ?? 0;",
        "    total ^= ((node << turn) | (node >> 1)) >>> 0;",
        "    if (node !== 0 && node % 5 === 0 && queue.length < 3) {",
        "      queue.push(Math.trunc(node / 5));",
        "    }",
        "    turn = turn === 3 ? 1 : turn + 1;",
        "  }",
        "  return total;",
        "};",
        "",
        f"export class {name} {{",
        "  private fragments: Fragment[] = [];",
        "  private memo: Record<string, number> = {};",
        "",
        "  absorb(name: string, value: number): void {",
        "    this.fragments.push({ label: name, weight: value, bias: twist(value, name.length, this.fragments.length + 1) });",
        "  }",
        "",
        "  resolve(): number {",
        "    return this.fragments.reduce((sum, item) => sum + (item.weight ^ item.bias), 0);",
        "  }",
        "",
    ]


def py_variant(index: int) -> list[str]:
    a, b = pair(index)
    mode = index % 6
    if mode == 0:
        return [
            f"    def splice_{a}_{index:04d}(self, seed: int) -> int:",
            f"        trail = [{index}, seed, seed ^ {index}, ({index} << 1) - seed]",
            "        cargo = []",
            "        for hop, item in enumerate(trail):",
            "            cargo.append((item ^ (hop + len(cargo))) & 0xFFFFFFFF)",
            f"        stitched = sum(cargo[::2]) - sum(cargo[1::2]) + len('{a}')",
            f"        self.memo['{a}_{index:04d}'] = stitched",
            "        return stitched ^ twist(stitched, seed | 1, len(cargo) + 1)",
            "",
        ]
    if mode == 1:
        return [
            f"    def invert_{b}_{index:04d}(self, seed: int) -> int:",
            f"        pivot = twist(seed + {index}, {index % 13 + 1}, len('{b}') + 2)",
            f"        veil = {{'odd': pivot & 1, 'word': '{b}', 'echo': pivot ^ seed}}",
            "        if veil['odd']:",
            "            answer = (veil['echo'] | pivot) - (veil['echo'] & pivot)",
            "        else:",
            "            answer = (veil['echo'] ^ pivot) + len(veil['word'])",
            f"        self.memo['{b}_{index:04d}'] = answer",
            "        return answer & 0xFFFFFFFF",
            "",
        ]
    if mode == 2:
        return [
            f"    def braid_{a}_{b}_{index:04d}(self, seed: int) -> int:",
            f"        nodes = deque([{index % 17 + 1}, seed, seed + {index}, seed - {index % 9 + 1}])",
            "        score = 0",
            "        while nodes:",
            "            chunk = nodes.pop()",
            "            score ^= (chunk * 3) + len(nodes)",
            "            if chunk % 4 == 0 and abs(chunk) > 2:",
            "                nodes.appendleft(chunk // 2)",
            f"        return score ^ len('{a}{b}')",
            "",
        ]
    if mode == 3:
        return [
            f"    def pocket_{index:04d}_{a}(self, seed: int) -> int:",
            f"        cloud = [seed + {index + 3}, seed ^ {index * 5 + 1}, (seed | {index % 11 + 2})]",
            "        marks = [str(item & 255) for item in cloud]",
            "        text = ':'.join(marks)",
            f"        answer = sum(ord(ch) for ch in text) + len('{a}')",
            f"        self.memo[text] = answer",
            "        return answer",
            "",
        ]
    if mode == 4:
        return [
            f"    def corridor_{b}_{index:04d}(self, seed: int) -> int:",
            f"        left = twist(seed, {index % 7 + 3}, {index % 19 + 1})",
            f"        right = twist(seed ^ left, {index % 5 + 5}, len('{b}') + 7)",
            "        combo = ((left | right) - (left & right)) & 0xFFFFFFFF",
            f"        return combo ^ {index * 9 + 17}",
            "",
        ]
    return [
        f"    def archive_{a}_{b}_{index:04d}(self, seed: int) -> int:",
        f"        fragment = Fragment('{a}:{b}', seed + {index}, twist(seed, {index % 23 + 1}, {index % 29 + 1}))",
        "        self.fragments.append(fragment)",
        "        blend = fragment.weight ^ fragment.bias ^ len(fragment.label)",
        f"        self.memo['frag_{index:04d}'] = blend",
        "        return blend",
        "",
    ]


def ts_variant(index: int) -> list[str]:
    a, b = pair(index)
    mode = index % 6
    if mode == 0:
        return [
            f"  splice_{a}_{index:04d}(seed: number): number {{",
            f"    const trail = [{index}, seed, seed ^ {index}, ({index} << 1) - seed];",
            "    const cargo: number[] = [];",
            "    for (const [hop, item] of trail.entries()) {",
            "      cargo.push((item ^ (hop + cargo.length)) >>> 0);",
            "    }",
            f"    const stitched = cargo.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) - cargo.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) + {len(a)};",
            f"    this.memo['{a}_{index:04d}'] = stitched;",
            "    return (stitched ^ twist(stitched, seed | 1, cargo.length + 1)) >>> 0;",
            "  }",
            "",
        ]
    if mode == 1:
        return [
            f"  invert_{b}_{index:04d}(seed: number): number {{",
            f"    const pivot = twist(seed + {index}, {index % 13 + 1}, {len(b) + 2});",
            f"    const veil = {{ odd: pivot & 1, word: '{b}', echo: pivot ^ seed }};",
            "    const answer = veil.odd",
            "      ? ((veil.echo | pivot) - (veil.echo & pivot))",
            "      : ((veil.echo ^ pivot) + veil.word.length);",
            f"    this.memo['{b}_{index:04d}'] = answer;",
            "    return answer >>> 0;",
            "  }",
            "",
        ]
    if mode == 2:
        return [
            f"  braid_{a}_{b}_{index:04d}(seed: number): number {{",
            f"    const nodes = [{index % 17 + 1}, seed, seed + {index}, seed - {index % 9 + 1}];",
            "    let score = 0;",
            "    while (nodes.length > 0) {",
            "      const chunk = nodes.pop() ?? 0;",
            "      score ^= (chunk * 3) + nodes.length;",
            "      if (chunk % 4 === 0 && Math.abs(chunk) > 2) {",
            "        nodes.unshift(Math.trunc(chunk / 2));",
            "      }",
            "    }",
            f"    return (score ^ {len(a + b)}) >>> 0;",
            "  }",
            "",
        ]
    if mode == 3:
        return [
            f"  pocket_{index:04d}_{a}(seed: number): number {{",
            f"    const cloud = [seed + {index + 3}, seed ^ {index * 5 + 1}, (seed | {index % 11 + 2})];",
            "    const marks = cloud.map((item) => String(item & 255));",
            "    const text = marks.join(':');",
            f"    const answer = [...text].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + {len(a)};",
            "    this.memo[text] = answer;",
            "    return answer;",
            "  }",
            "",
        ]
    if mode == 4:
        return [
            f"  corridor_{b}_{index:04d}(seed: number): number {{",
            f"    const left = twist(seed, {index % 7 + 3}, {index % 19 + 1});",
            f"    const right = twist(seed ^ left, {index % 5 + 5}, {len(b) + 7});",
            "    const combo = ((left | right) - (left & right)) >>> 0;",
            f"    return (combo ^ {index * 9 + 17}) >>> 0;",
            "  }",
            "",
        ]
    return [
        f"  archive_{a}_{b}_{index:04d}(seed: number): number {{",
        f"    const fragment: Fragment = {{ label: '{a}:{b}', weight: seed + {index}, bias: twist(seed, {index % 23 + 1}, {index % 29 + 1}) }};",
        "    this.fragments.push(fragment);",
        "    const blend = fragment.weight ^ fragment.bias ^ fragment.label.length;",
        f"    this.memo['frag_{index:04d}'] = blend;",
        "    return blend >>> 0;",
        "  }",
        "",
    ]


def py_footer() -> list[str]:
    return [
        "",
        "if __name__ == '__main__':",
        "    demo = H256()",
        "    demo.absorb('entry', 10)",
        "    demo.absorb('spare', 21)",
        "    print(hex(demo.resolve()))",
    ]


def ts_footer() -> list[str]:
    return [
        "}",
        "",
        "const demo = new H256();",
        "demo.absorb('entry', 10);",
        "demo.absorb('spare', 21);",
        "console.log(demo.resolve().toString(16));",
    ]


def build_lines(lang: str, target_lines: int, name: str) -> list[str]:
    lines = py_header(name) if lang == "py" else ts_header(name)
    block_builder = py_variant if lang == "py" else ts_variant
    footer = py_footer() if lang == "py" else ts_footer()

    index = 1
    while len(lines) + len(footer) + 12 < target_lines:
        lines.extend(block_builder(index))
        index += 1

    lines.extend(footer)

    while len(lines) < target_lines:
        if lang == "py":
            lines.append(f"# shard-{len(lines) + 1:04d}-{WORDS[len(lines) % len(WORDS)]}")
        else:
            lines.append(f"// shard-{len(lines) + 1:04d}-{WORDS[len(lines) % len(WORDS)]}")

    return lines[:target_lines]


def main() -> int:
    args = parse_args()
    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = build_lines(args.lang, args.lines, args.name)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Created: {output_path}")
    print(f"Lines: {len(lines)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
