import { spawn } from "child_process"
import { DATABASE } from "../../app/DATABASE"
import { ENV } from "../../app/ENV"
import { Track, TractImporterContract } from "../../common/Track"
import { makeRandomID } from "../../comTypes/util"
import { DIContext } from "../../dependencyInjection/DIContext"
import { Logger } from "../../logger/Logger"
import { DataPort } from "../DataPort"
import { getSafeTrackFileName } from "../util"
import { Tracks } from "./Tracks"
import { YoutubeAdapter } from "./YoutubeAdapter"

export class TrackImporterController extends TractImporterContract.defineController() {
    protected logger = DIContext.current.inject(Logger).prefix({ color: "yellow", label: "IMPORT" })

    public impl = super.impl({
        importTracks: async () => {
            this.importTracks()
        },
        setYoutubeDL: async ({ playlist }) => {
            this.mutate(v => v.settings.youtubeDL = playlist)
            DATABASE.setDirty()
        }
    })

    public async importTracks() {
        this.mutate(v => v.isRunning = true)
        this.mutate(v => v.downloadOutput = [])
        this.mutate(v => v.downloadedTracks = null)

        if (this.settings.youtubeDL) {
            this.write("YoutubeDL is enabled, downloading...")
            const success = await new Promise<boolean>((resolve, reject) => {
                const dl = spawn(ENV.YOUTUBE_DL_PATH ?? "youtube-dl", ["-x", this.settings.youtubeDL!, "--download-archive=archive"], {
                    shell: true,
                    stdio: "pipe",
                    cwd: DataPort.getImportFolder()
                })

                dl.stdout.on("data", (chunk) => {
                    this.write(chunk.toString())
                })

                dl.stderr.on("data", (chunk) => {
                    this.write(chunk.toString())
                })

                dl.on("exit", (code) => {
                    if (code == 0) resolve(true)
                    else {
                        this.write("Program error code: " + code)
                        resolve(false)
                    }
                })

                dl.on("error", (err) => {
                    this.logger.error`${err}`
                })
            })

            if (!success) {
                this.mutate(v => v.isRunning = false)
                return
            }
        }

        this.write("Reading tracks...")
        const trackFiles = await DataPort.getTracksToImport()
        this.write(`Got ${trackFiles.length} tracks`)

        this.write("Importing...")
        const tracks = new Map<string, Track>()
        const queue: Promise<void>[] = []
        let done = 0
        for (const trackFile of trackFiles) {
            const write = (msg: string) => this.write(`[IMPORT (${done}/${trackFiles.length})] ${trackFile.name} - ${msg}`)
            queue.push((async () => {

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

                track.url = await trackFile.import(getSafeTrackFileName(track) + "_" + track.id)
                Tracks.addTrack(track)
                tracks.set(track.id, track)
                done++
                write(`Done`)
            })().catch(err => {
                write("Import failed, you can always try again")
                this.logger.error`${err}`
                done++
            }))
        }
        await Promise.all(queue)

        this.mutate(v => v.isRunning = false)
        this.mutate(v => v.downloadOutput = null)
        this.mutate(v => v.downloadedTracks = tracks)
    }

    protected write(msg: string) {
        if (!this.downloadOutput) throw new Error("Tried to write to output while output not active")
        this.mutate(v => v.downloadOutput!.push(msg + "\n"))
    }

    public static make() {
        const controller = TrackImporterController.default()
        const settings = DATABASE.tryGet("trackImportSettings")
        if (settings) {
            controller.settings = settings
        } else {
            DATABASE.put("trackImportSettings", controller.settings)
        }

        Tracks.onTrackDeleted.add(controller, (track) => {
            if (!controller.downloadedTracks?.has(track.id)) return
            controller.mutate(v => v.downloadedTracks!.delete(track.id))
        })

        Tracks.onTrackUpdated.add(controller, (track) => {
            if (!controller.downloadedTracks?.has(track.id)) return
            controller.mutate(v => v.downloadedTracks!.set(track.id, track))
        })

        return controller
    }
}