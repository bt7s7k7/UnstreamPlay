import fallbackIcon from "./fallback-icon.svg?url"

export function getIconURL(icon: string | undefined | null) {
    if (icon) {
        if (import.meta.env.BASE_URL != "/") return `${import.meta.env.BASE_URL}icons/${icon}`
        return `/icons/${icon}`
    } else {
        return fallbackIcon
    }
}

export function getTrackURL(track: string | undefined | null) {
    if (track) {
        if (import.meta.env.BASE_URL != "/") return `${import.meta.env.BASE_URL}tracks/${track}`
        return `/tracks/${track}`
    } else {
        return undefined
    }
}