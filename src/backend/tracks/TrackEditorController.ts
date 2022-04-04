import { TrackEditorContract } from "../../common/Track"
import { ClientError } from "../../structSync/StructSyncServer"
import { Tracks } from "./Tracks"

export class TrackEditorController extends TrackEditorContract.defineController() {
    public impl = super.impl({
        setTrackAuthor: async ({ track: trackID, author }) => {
            const track = Tracks.findTrack(trackID)
            if (!track) throw new ClientError(`No track with id "${trackID}" found`)
            Tracks.updateTrack(track, { author })
        },
        setTrackLabel: async ({ track: trackID, label }) => {
            const track = Tracks.findTrack(trackID)
            if (!track) throw new ClientError(`No track with id "${trackID}" found`)
            Tracks.updateTrack(track, { label })
        },
        deleteTrack: async ({ track: trackID }) => {
            const track = Tracks.findTrack(trackID)
            if (!track) throw new ClientError(`No track with id "${trackID}" found`)
            Tracks.deleteTrack(track)
        }
    })
}