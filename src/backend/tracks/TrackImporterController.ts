import { Track, TractImporterContract } from "../../common/Track"
import { makeRandomID } from "../../comTypes/util"
import { DIContext } from "../../dependencyInjection/DIContext"
import { Logger } from "../../logger/Logger"
import { LogMarker } from "../../logger/ObjectDescription"
import { DataPort } from "../DataPort"
import { Tracks } from "./Tracks"
import { YoutubeAdapter } from "./YoutubeAdapter"

export class TrackImporterController extends TractImporterContract.defineController() {
    protected logger = DIContext.current.inject(Logger).prefix({ color: "yellow", label: "IMPORT" })

    public impl = super.impl({
        importTracks: async () => {
            this.importTracks()
        }
    })

    public async importTracks() {
        this.mutate(v => v.isRunning = true)
        this.mutate(v => v.downloadOutput = [])
        this.mutate(v => v.downloadedTracks = null)

        this.write("Reading tracks...")
        const trackFiles = await DataPort.getTracksToImport()
        this.write(`Got ${trackFiles.length} tracks`)

        this.write("Importing...")
        const tracks = new Map<string, Track>()
        const queue: Promise<void>[] = []
        let done = 0
        for (const trackFile of trackFiles) {
            queue.push((async () => {
                const write = (msg: string) => this.write(`[IMPORT (${done}/${trackFiles.length})] ${trackFile.name} - ${msg}`)

                write("Importing: " + trackFile.name)
                const track = new Track({
                    id: trackFile.id ?? makeRandomID(),
                    author: "unknown",
                    label: trackFile.name,
                    icon: "",
                    url: ""
                })

                if (trackFile.id) {
                    write("Getting YouTube data...")
                    const youtubeData = await YoutubeAdapter.loadTrackInfo(track.id)
                    if (youtubeData) {
                        track.label = youtubeData.label
                        track.author = youtubeData.author
                        track.icon = await DataPort.writeTrackIcon(track.id, youtubeData.icon, youtubeData.iconExtension)
                    } else {
                        write("Failed to get youtube data :(")
                    }
                }

                track.url = await trackFile.import(track.id)
                Tracks.addTrack(track)
                tracks.set(track.id, track)
                done++
                write(`Done`)
            })())
        }
        await Promise.all(queue)

        this.mutate(v => v.isRunning = false)
        this.mutate(v => v.downloadOutput = null)
        this.mutate(v => v.downloadedTracks = tracks)
    }

    protected write(msg: string) {
        if (!this.downloadOutput) throw new Error("Tried to write to output while output not active")
        this.logger.info`${LogMarker.rawText(msg)}`
        this.mutate(v => v.downloadOutput!.push(msg + "\n"))
    }

    public static make() {
        const controller = TrackImporterController.default()
        Tracks.onTrackDeleted.add(controller, (track) => {
            if (!controller.downloadedTracks?.has(track.id)) return
            controller.mutate(v => v.downloadedTracks!.delete(track.id))
        })

        Tracks.onTrackUpdated.add(controller, (track) => {
            if (!controller.downloadedTracks?.has(track.id)) return
            controller.mutate(v => v.downloadedTracks!.set(track.id, track))
        })
    }
}