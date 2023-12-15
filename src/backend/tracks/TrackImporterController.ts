import { spawn } from "child_process"
import { DATABASE } from "../../app/DATABASE"
import { ENV } from "../../app/ENV"
import { makeRandomID } from "../../comTypes/util"
import { Track, TractImporterContract } from "../../common/Track"
import { DIContext } from "../../dependencyInjection/DIContext"
import { Logger } from "../../logger/Logger"
import { LogMarker } from "../../prettyPrint/ObjectDescription"
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
        setPlaylist: async ({ playlist }) => {
            this.mutate(v => v.settings.playlist = playlist)
            DATABASE.setDirty()
        }
    })

    public async importTracks(isCLI = false) {
        this.mutate(v => v.isRunning = true)
        this.mutate(v => v.downloadOutput = [])
        this.mutate(v => v.downloadedTracks = null)

        const logWrite = (msg: string) => {
            if (isCLI) this.logger.info`${LogMarker.rawText(msg)}`
            this.write(msg)
        }

        if (this.settings.playlist) {
            logWrite("Downloader is enabled, starting...")
            const success = await new Promise<boolean>((resolve, reject) => {
                const type = ENV.DOWNLOADER_TYPE ?? "yt-dlp"
                const path = ENV.DOWNLOADER_PATH ?? type

                const args = ["-x", this.settings.playlist!, "--download-archive=archive"]
                if (type == "yt-dlp") {
                    args.push("--compat-options", "no-youtube-unavailable-videos")
                }
                const dl = spawn(path, args, {
                    shell: true,
                    stdio: "pipe",
                    cwd: DataPort.getImportFolder()
                })

                dl.stdout.on("data", (chunk) => {
                    logWrite(chunk.toString())
                })

                dl.stderr.on("data", (chunk) => {
                    logWrite(chunk.toString())
                })

                dl.on("exit", (code) => {
                    if (code == 0) resolve(true)
                    else {
                        logWrite("Program error code: " + code)
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

        logWrite("Reading tracks...")
        const trackFiles = await DataPort.getTracksToImport()
        logWrite(`Got ${trackFiles.length} tracks`)

        logWrite("Importing...")
        const tracks = new Map<string, Track>()
        const queue: Promise<void>[] = []
        let done = 0
        for (const trackFile of trackFiles) {
            const write = (msg: string) => logWrite(`[IMPORT (${done}/${trackFiles.length})] ${trackFile.name} - ${msg}`)
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
                } else {
                    write("Getting tags...")
                    const tags = await trackFile.loadTags()
                    if (tags.tags.picture) {
                        const format = tags.tags.picture.format
                        const data = tags.tags.picture.data
                        if (format.startsWith("image/")) {
                            track.icon = await DataPort.writeTrackIcon(track.id, new Uint8Array(data).buffer, format.substring(6))
                        } else {
                            write("Tried to get picture from tags, but format not supported")
                        }
                    }

                    if (tags.tags.artist != null) track.author = tags.tags.artist
                    if (tags.tags.title != null) track.label = tags.tags.title
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

        logWrite("Importing finished")

        this.mutate(v => v.isRunning = false)
        this.mutate(v => v.downloadOutput = null)
        this.mutate(v => v.downloadedTracks = tracks)
    }

    protected write(msg: string) {
        if (!this.downloadOutput) throw new Error("Tried to write to output while output not active")
        const lastIndex = this.downloadOutput.length - 1
        const last = this.downloadOutput[lastIndex]
        if (last) {
            const startRegex = /^(.*?)[\d.]+%/m
            const lastMatch = last.trim().match(startRegex)
            const currMatch = msg.trim().match(startRegex)
            if (lastMatch != null && currMatch != null) {
                const lastStart = lastMatch[1]!
                const currStart = currMatch[1]!
                if (lastStart == currStart) {
                    this.mutate(v => v.downloadOutput![lastIndex] = msg)
                    return
                }
            }
        }

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
