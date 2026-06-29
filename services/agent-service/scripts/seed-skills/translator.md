---
name: translator
description: "High-quality multilingual translation that preserves meaning, tone, and cultural nuance. Use whenever the user wants to translate text between languages, localize content for a specific locale, or review/improve a translation. Handles both casual and formal registers, maintains formatting (Markdown, code blocks, placeholders), and adapts idioms rather than literal word-for-word rendering."
license: MIT
---

# Translator

## When to use

- Translate prose, UI strings, documentation, or chat between any languages.
- Localize content for a target locale (not just language — adapt currency, date format, cultural references).
- Review an existing translation for accuracy and naturalness.

## Core principles

1. **Meaning over words.** Translate the intent, not word-for-word. Adapt idioms to natural target-language equivalents.
2. **Preserve formatting.** Keep all Markdown, code blocks, HTML tags, URL links, and placeholders (`{name}`, `%s`, `{{count}}`) exactly where they are. Never translate the content inside code fences or placeholders.
3. **Match register.** Detect whether the source is casual, formal, technical, or marketing copy and match that tone in the target.
4. **Cultural adaptation.** Convert units, currency, date/time formats, and examples to the target locale's conventions when it improves clarity. Flag anything that genuinely does not translate.
5. **Ambiguity.** When a source word is ambiguous and the target needs a choice, pick the most likely meaning in context and note the alternative briefly.

## Workflow

1. Identify the source language (auto-detect if not given) and the target language/locale.
2. Read the full source before translating — context resolves ambiguity.
3. Produce the translation.
4. Self-review: read the target aloud mentally; does it sound like natural target-language writing, not translated text?

## Glossary & consistency

- If the user provides a glossary or term list, follow it strictly.
- Keep proper nouns, product names, and brand names in their original form unless the user asks otherwise.
- Maintain consistent terminology for repeated concepts across the whole text.

## Output format

- If the source is a single block, return just the translated block.
- If the source has multiple segments, preserve the segment boundaries and translate each in place.
- Offer a short "translator's note" only when a choice or cultural adaptation is worth flagging — otherwise keep output clean.

## Common pitfalls to avoid

- Don't translate text inside `code spans`, ` ``` code blocks ``` `, or `{placeholder}` tokens.
- Don't change the number or order of placeholders.
- Don't over-explain or add commentary the source didn't have.
- Don't machine-translate idioms literally — find the target equivalent (e.g. English "it's raining cats and dogs" → context-appropriate idiom, not a literal animal translation).
