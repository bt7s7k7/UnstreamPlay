import { renameSync } from "fs"
import { extname, join } from "path"
import { DataPort } from "../backend/DataPort"
import { exportTracks } from "../backend/exportTracks"
import { PlaylistManagerController } from "../backend/playlist/PlaylistManagerController"
import { SpeakerManagerController } from "../backend/SpeakerManagerController"
import { TrackImporterController } from "../backend/tracks/TrackImporterController"
import { Tracks } from "../backend/tracks/Tracks"
import { getSafeTrackFileName } from "../backend/util"
import { DIContext } from "../dependencyInjection/DIContext"
import { DIService } from "../dependencyInjection/DIService"
import { Logger } from "../logger/Logger"
import { FormRenderer } from "../remoteUIBackend/FormRenderer"
import { defineRouteController } from "../remoteUIBackend/RouteController"
import { UI } from "../remoteUICommon/UIElement"
import { Type } from "../struct/Type"
import { ClientError } from "../structSync/StructSyncServer"

export class Admin extends DIService {
    public readonly logger = DIContext.current.inject(Logger)

    public runCLICommand(command: string, args: string[]) {
        if (command == "import") {
            this.importTracks()
        } else if (command == "reset") {
            this.reset()
        } else if (command == "export") {
            const [path] = args
            this.export(path, "all-tracks")
        } else if (command == "name_tracks") {
            this.nameTracks()
        } else if (command == "speakers") {
            for (const [id, label] of this.speakerManager.speakers) {
                this.logger.info`${id}: ${label}`
            }
        } else {
            this.logger.error`Unknown command, expected: ${"import"}, ${"reset"}, ${"export <path>"}, ${"name_tracks"} or ${"speakers"}`
        }
    }

    protected nameTracks() {
        const trackFolder = DataPort.getTracksFolder()

        for (const track of Tracks.listTracks()) {
            const oldFilename = track.url
            const ext = extname(oldFilename)
            const newFilename = getSafeTrackFileName(track) + "_" + track.id + ext
            renameSync(join(trackFolder, oldFilename), join(trackFolder, newFilename))
            Tracks.updateTrack(track, { url: newFilename })
        }

        this.logger.info`Tracks renamed!`
    }

    protected export(path: string, playlistID: string) {
        const playlist = this.playlistManager.playlistControllers.get(playlistID)
        if (!playlist) throw new ClientError(`Cannot find playlist "${playlistID}"`)
        exportTracks(path, playlist, this.logger)
    }

    protected reset() {
        DataPort.deleteEverything().then(() => process.exit(0))
    }

    protected importTracks() {
        this.trackImporter.importTracks(true)
    }

    public ui = defineRouteController(ctx => {
        const importTracks = ctx.action("importTracks", () => {
            this.importTracks()
        })

        const nameTracks = ctx.action("nameTracks", () => {
            this.nameTracks()
        })

        const reset = ctx.action("reset", (event) => {
            this.reset()
            event.session.redirect("?page=")
        })

        const exportTracks = ctx.action("exportTracks", (event) => {
            if (event.sender == "all-tracks_") event.sender = "all-tracks"
            event.session.redirect("?page=export&playlist=" + encodeURIComponent(event.sender!))
        })

        const exportForm = ctx.form("exportForm", Type.object({ path: Type.string }), () => ({ path: "" }))
        const exportFormSubmit = exportForm.action("exportFormSubmit", (event) => {
            this.export(event.data.path, event.session.route.query.playlist)
            event.session.redirect("?page=playlists")
        })
        const exportFormRender = new FormRenderer({ type: Type.object({ path: Type.string }), model: exportForm.id }).renderFrame()

        return (session) => (
            session.route.query.page == "reset" ? (
                UI.frame({
                    axis: "column",
                    margin: "a2",
                    padding: "a2",
                    border: true,
                    rounded: true,
                    gap: 2,
                    children: [
                        UI.label({ text: "Are you sure you want to reset all data?" }),
                        UI.frame({
                            gap: 2,
                            children: [
                                UI.button({ text: "Delete", variant: "danger", onClick: reset }),
                                UI.button({ text: "Cancel", to: "?page=" })
                            ]
                        })
                    ]
                })
            ) : session.route.query.page == "playlists" ? (
                UI.frame({
                    axis: "column",
                    margin: "y2",
                    padding: "a2",
                    border: true,
                    rounded: true,
                    gap: 1,
                    children: [
                        UI.label({ text: "Playlists", size: "h3", margin: "a0l1" }),
                        ...[...this.playlistManager.playlistControllers.values()].map(playlist => (
                            UI.frame({
                                axis: "row",
                                children: [
                                    UI.button({
                                        text: playlist.label,
                                        clear: true,
                                        textAlign: "left",
                                        fill: true,
                                        name: playlist.id,
                                        onClick: exportTracks
                                    }),
                                ]
                            })
                        ))
                    ]
                })
            ) : session.route.query.page == "export" ? (
                UI.frame({
                    axis: "column",
                    margin: "y2",
                    padding: "a2",
                    border: true,
                    rounded: true,
                    gap: 2,
                    children: [
                        UI.frame({
                            gap: 2,
                            children: [
                                UI.label({
                                    text: this.playlistManager.playlistControllers.get(session.route.query.playlist)!.label,
                                    size: "h3", margin: "a0"
                                }),
                                UI.label({ text: "Export tracks", size: "small" })
                            ]
                        }),
                        exportFormRender,
                        UI.frame({
                            axis: "row",
                            gap: 2,
                            children: [
                                UI.button({ text: "Export", variant: "success", onClick: exportFormSubmit }),
                                UI.button({ text: "Cancel", to: "?page=playlists" })
                            ]
                        })
                    ]
                })
            ) : (
                UI.frame({
                    margin: "a2",
                    axis: "column",
                    children: [
                        UI.frame({
                            axis: "row",
                            gap: 2,
                            border: true,
                            padding: "a2",
                            rounded: true,
                            children: [
                                UI.button({ text: "Import Tracks", onClick: importTracks }),
                                UI.button({ text: "Name Tracks", onClick: nameTracks }),
                                UI.button({ text: "Reset", to: "?page=reset" })
                            ]
                        }),
                        UI.embed({ route: "?page=playlists" })
                    ]
                })
            )
        )
    })

    constructor(
        public readonly trackImporter: TrackImporterController,
        public readonly speakerManager: SpeakerManagerController,
        public readonly playlistManager: PlaylistManagerController
    ) {
        super()
        playlistManager.onPlaylistsChanged.add(null, () => {
            for (const session of this.ui.getSessions()) {
                if (session.route.query.page == "playlists") {
                    session.update()
                }
            }
        })
    }

}