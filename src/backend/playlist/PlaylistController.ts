import { DATABASE } from "../../app/DATABASE"
import { PlaylistContract, PlaylistData, PlaylistInfo, ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { binarySearch } from "../../comTypes/util"
import { EventEmitter } from "../../eventLib/EventEmitter"
import { ClientError } from "../../structSync/StructSyncServer"
import { Tracks } from "../tracks/Tracks"
import { trackCompare } from "../util"
import { PlaylistManagerController } from "./PlaylistManagerController"

export class PlaylistController extends PlaylistContract.defineController() {
    public readonly onInfoChanged = new EventEmitter<PlaylistInfo>()

    public trackIndex = new Map<string, Track>()
    public data: PlaylistData = null!
    public manager: PlaylistManagerController = null!

    public impl = super.impl({
        addTrack: async ({ track: trackID }) => {
            if (this.id == ROOT_PLAYLIST_ID) throw new ClientError("Cannot add tracks to root playlist")

            if (trackID == "$imported") {
                const tracks = this.manager.trackImporter.downloadedTracks
                if (!tracks) throw new ClientError("There are no tracks imported")

                for (const track of tracks.values()) {
                    this.addTrack(track)
                }

                return
            }

            const track = Tracks.findTrack(trackID)
            if (!track) throw new ClientError(`No track with id "${trackID}" found`)
            this.addTrack(track)
        },
        removeTrack: async ({ track: trackID }) => {
            if (this.id == ROOT_PLAYLIST_ID) throw new ClientError("Cannot remove tracks from root playlist")

            if (trackID == "$imported") {
                const tracks = this.manager.trackImporter.downloadedTracks
                if (!tracks) throw new ClientError("There are no tracks imported")

                for (const track of tracks.values()) {
                    this.removeTrack(track)
                }

                return
            }

            const track = Tracks.findTrack(trackID)
            if (!track) throw new ClientError(`No track with id "${trackID}" found`)
            this.removeTrack(track)
        },
        setLabel: async ({ label }) => {
            if (this.id == ROOT_PLAYLIST_ID) throw new ClientError("Cannot change name of root playlist")

            this.mutate(v => v.label = label)
            this.data.label = label
            this.onInfoChanged.emit(this.getInfo())
            DATABASE.setDirty()
        }
    })

    public addTrack(track: Track) {
        if (this.trackIndex.has(track.id)) return

        let index = binarySearch(this.tracks, (a) => trackCompare(track, a))
        if (index > 0) index = -index
        index = -index - 1

        this.mutate(v => v.tracks.splice(index, 0, track))
        this.trackIndex.set(track.id, track)
        this.data.tracks.add(track.id)

        DATABASE.setDirty()
    }

    public removeTrack(track: Track) {
        if (!this.trackIndex.has(track.id)) return

        this.trackIndex.delete(track.id)

        const index = this.tracks.findIndex(v => v.id == track.id)
        if (index == -1) throw new Error("Controller does not have a track even though it was indexed")
        this.mutate(v => v.tracks.splice(index, 1))
        this.data.tracks.delete(track.id)

        DATABASE.setDirty()
    }

    public updateTrack(track: Track) {
        if (!this.trackIndex.has(track.id)) return

        const index = this.tracks.findIndex(v => v.id == track.id)
        if (index == -1) throw new Error("Controller does not have a track even though it was indexed")
        this.mutate(v => v.tracks[index] = track)

        DATABASE.setDirty()
    }

    public getInfo() {
        return new PlaylistInfo({
            id: this.id,
            label: this.label
        })
    }

    public static make(data: PlaylistData) {
        const controller = new PlaylistController({
            id: data.id,
            label: data.label,
            tracks: []
        })

        controller.data = data

        for (const trackID of data.tracks) {
            const track = Tracks.findTrack(trackID)
            if (!track) {
                data.tracks.delete(trackID)
                continue
            }

            controller.addTrack(track)
        }

        Tracks.onTrackDeleted.add(controller, (track) => {
            controller.removeTrack(track)
        })

        Tracks.onTrackUpdated.add(controller, (track) => {
            controller.updateTrack(track)
        })

        return controller
    }
}