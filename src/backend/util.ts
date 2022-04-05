import { Track } from "../common/Track"

const collator = new Intl.Collator()

export function trackCompare(a: Track, b: Track) {
    const authorCompare = collator.compare(a.author.toLowerCase(), b.author.toLowerCase())
    if (authorCompare != 0) return authorCompare
    const labelCompare = collator.compare(a.label.toLowerCase(), b.label.toLowerCase())
    return labelCompare
}