import { logger } from "../../app/app"
import { DATABASE } from "../../app/DATABASE"
import { Track } from "../../common/Track"
import { modify } from "../../comTypes/util"
import { EventEmitter } from "../../eventLib/EventEmitter"

export namespace Tracks {
    export const onTrackUpdated = new EventEmitter<Track>()
    export const onTrackCreated = new EventEmitter<Track>()
    export const onTrackDeleted = new EventEmitter<Track>()

    export function addTrack(track: Track) {
        DATABASE.put("tracks", track)
        onTrackCreated.emit(track)
        logger.info`Added track ${track}`
    }

    export function findTrack(trackID: string) {
        return DATABASE.tryGet("tracks", trackID)
    }

    export function updateTrack(track: Track, update: Omit<Partial<Track>, "serialize">) {
        modify(track, update)
        onTrackUpdated.emit(track)
    }
}