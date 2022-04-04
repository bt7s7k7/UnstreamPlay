import fallbackIcon from "./fallback-icon.svg?url"

export function getIconURL(icon: string | undefined | null) {
    if (icon) {
        return `/icons/${icon}`
    } else {
        return fallbackIcon
    }
}

export function getTrackURL(track: string | undefined | null) {
    if (track) {
        return `/tracks/${track}`
    } else {
        return undefined
    }
}