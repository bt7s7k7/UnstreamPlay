import { copyFile, readdir } from "fs/promises"
import { extname, join } from "path"
import { Track } from "../common/Track"
import { Logger } from "../logger/Logger"
import { LogMarker } from "../logger/ObjectDescription"
import { DataPort } from "./DataPort"
import { PlaylistController } from "./playlist/PlaylistController"
import { getSafeTrackFileName } from "./util"

export async function exportTracks(path: string, playlist: PlaylistController, logger: Logger) {
    const queue: Promise<void>[] = []
    const existing = new Set(await readdir(path))
    let pending = 0
    let done = 0

    const write = (track: Track, state: "pending" | "done" | Error) => {
        logger.info`Exporting... (${pending}/${done}), [${state == "pending" ? (
            LogMarker.rawText("PENDING", "yellow")
        ) : state == "done" ? (
            LogMarker.rawText("DONE", "green")
        ) : (
            LogMarker.rawText("ERROR", "red")
        )
            }] ${track.author} - ${track.label}`
    }

    for (const track of playlist.tracks) {
        queue.push((async () => {
            if (!track.url) return

            const extension = extname(track.url)
            const targetName = getSafeTrackFileName(track)
                + extension
            if (existing.has(targetName)) return

            pending++
            await Promise.resolve()

            write(track, "pending")
            const trackFile = join(DataPort.getTracksFolder(), track.url)
            const targetPath = join(path, targetName)

            try {
                await copyFile(trackFile, targetPath)
                done++
                write(track, "done")
            } catch (err: any) {
                done++
                write(track, err)
                logger.error`${err}`
            }
        })())
    }

    await Promise.all(queue)

    logger.info`Exporting finished!`
}
