import { DATABASE } from "../../app/DATABASE"
import { PlaylistData, PlaylistManagerContract, ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { makeRandomID } from "../../comTypes/util"
import { DISPOSE } from "../../eventLib/Disposable"
import { StructSyncContract } from "../../structSync/StructSyncContract"
import { ClientError } from "../../structSync/StructSyncServer"
import { TrackImporterController } from "../tracks/TrackImporterController"
import { Tracks } from "../tracks/Tracks"
import { PlaylistController } from "./PlaylistController"

export class PlaylistManagerController extends PlaylistManagerContract.defineController() {
    public playlistControllers = new Map<string, PlaylistController>()

    public trackImporter: TrackImporterController = null!

    public impl = super.impl({
        createPlaylist: async ({ label }) => {
            const playlistData = new PlaylistData({
                id: makeRandomID(),
                label, tracks: new Set()
            })

            DATABASE.put("playlists", playlistData)

            this.loadPlaylist(playlistData)

            return playlistData.id
        },
        deletePlaylist: async ({ playlist }) => {
            if (playlist == ROOT_PLAYLIST_ID) throw new ClientError("Cannot delete root playlist")
            const controller = this.playlistControllers.get(playlist)
            if (!controller) throw new ClientError(`There is no playlist with id "${playlist}"`)

            controller[DISPOSE]()
            DATABASE.delete("playlists", playlist)
            this.mutate(v => v.playlists.delete(playlist))
        },
        getPlaylistsSnippet: async () => {
            const result = new Map<string, Track[]>()

            for (const playlist of this.playlistControllers.values()) {
                result.set(playlist.id, playlist.tracks.slice(0, 10))
            }

            return result
        },
        getPlaylistsWithTrack: async ({ track }) => {
            const playlists = new Set<string>()

            for (const playlist of this.playlistControllers.values()) {
                if (playlist.id == ROOT_PLAYLIST_ID) continue
                if (playlist.trackIndex.has(track)) playlists.add(playlist.id)
            }

            return playlists
        }
    })

    protected loadPlaylist(playlistData: PlaylistData) {
        const controller = PlaylistController.make(playlistData)
        controller.manager = this
        controller.register(this[StructSyncContract.SERVER] ?? undefined)
        this.mutate(v => v.playlists.set(controller.id, controller.getInfo()))

        controller.onInfoChanged.add(this, info => {
            this.mutate(v => v.playlists.set(controller.id, info))
        })

        this.playlistControllers.set(controller.id, controller)

        return controller
    }

    public static make() {
        const controller = PlaylistManagerController.default()

        if (!DATABASE.tryGet("playlists", ROOT_PLAYLIST_ID)) {
            DATABASE.put("playlists", new PlaylistData({
                id: ROOT_PLAYLIST_ID,
                label: "All tracks",
                tracks: new Set()
            }))
        }

        let rootController: PlaylistController

        for (const playlist of DATABASE.list("playlists")) {
            const playlistController = controller.loadPlaylist(playlist)
            if (playlistController.id == ROOT_PLAYLIST_ID) rootController = playlistController
        }

        Tracks.onTrackCreated.add(controller, (track) => {
            rootController.addTrack(track)
        })

        return controller
    }
}