import { mkdir, opendir, readFile, rename, rm, writeFile } from "fs/promises"
import { join, parse } from "path"
import { DATABASE } from "../app/DATABASE"
import { ENV } from "../app/ENV"
import { Logger } from "../logger/Logger"

const TRACK_EXTS = new Set([".opus", ".m4a", ".mp3", ".ogg", ".wav"])

let logger: Logger = null!
const databasePath = join(ENV.DATA_PATH, "db.json")
const importPath = join(ENV.DATA_PATH, "import")
const tracksPath = join(ENV.DATA_PATH, "tracks")
const iconsPath = join(ENV.DATA_PATH, "icons")

export interface TrackToImport {
    id: string | null
    name: string
    path: string
    import(name: string): Promise<string>
}

export namespace DataPort {
    export async function init(newLogger: Logger) {
        logger = newLogger

        for (const folder of [ENV.DATA_PATH, importPath, tracksPath, iconsPath]) {
            await mkdir(folder).catch((err) => { if (err.code == "EEXIST") return null; else throw err })
        }

        const databaseData = await readFile(databasePath).catch(err => { if (err.code == "ENOENT") return null; else throw err })
        if (databaseData) {
            DATABASE.import(JSON.parse(databaseData.toString()))
        } else {
            logger.warn`Database file not found`
        }
    }

    export async function saveDatabase() {
        await writeFile(databasePath, JSON.stringify(DATABASE.export()))
    }

    export async function getTracksToImport() {
        const tracks: TrackToImport[] = []

        for await (const file of await opendir(importPath)) {
            const path = join(importPath, file.name)
            const { name: stem, ext } = parse(path)
            if (!TRACK_EXTS.has(ext)) continue
            const matches = stem.match(/^(.*?)-([A-Za-z0-9-_]+)$/)
            const name = matches?.[1] ?? stem
            const id = matches?.[2] ?? null

            tracks.push({
                id, name, path,
                async import(targetName: string) {
                    const filename = targetName + ext
                    await rename(path, join(tracksPath, filename))
                    return filename
                }
            })
        }

        return tracks
    }

    export async function writeTrackIcon(id: string, data: ArrayBuffer, ext: string) {
        const filename = id + ext
        await writeFile(join(iconsPath, filename), new Uint8Array(data))
        return filename
    }

    export async function deleteEverything() {
        await rm(ENV.DATA_PATH, { recursive: true })
    }

    export function getTracksFolder() {
        return tracksPath
    }

    export function getIconsFolder() {
        return iconsPath
    }
}