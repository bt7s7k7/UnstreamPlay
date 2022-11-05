import { computed, onUnmounted, Ref, ref } from "vue"
import { Track } from "../../common/Track"
import { DISPOSE } from "../../eventLib/Disposable"
import { asyncComputed } from "../../vue3gui/util"
import { STATE } from "../State"

export type PlaybackType = "shuffle" | "linear"

export function usePlaylist(playlistID: Ref<string | null>) {
    const playlist = asyncComputed(() => playlistID.value, async (playlistID) => playlistID ? STATE.findPlaylist(playlistID) : null, {
        finalizer: v => v?.[DISPOSE](),
        onSuccess() {
            history.clear()
        }
    })
    onUnmounted(() => playlist.value?.[DISPOSE]())

    const selectedTrackID = ref<string | null>(null)
    function selectTrack(id: string) {
        selectedTrackID.value = id
        history.add(id)
        if (playlist.value) {
            while (history.size > 0 && history.size > playlist.value.tracks.length / 2) {
                history.delete(history.values().next().value)
            }
        }
    }
    const selectedTrack = computed(() => selectedTrackID.value ? playlist.value?.tracks.find(v => v.id == selectedTrackID.value) : null)

    const queuedTrackID = ref<string | null>(null)
    const queuedTrack = computed(() => queuedTrackID.value ? playlist.value?.tracks.find(v => v.id == queuedTrackID.value) : null)
    function selectQueuedTrack(id: string | null) {
        queuedTrackID.value = id
    }

    const playbackType = ref<PlaybackType>("shuffle")

    const history = new Set<string>()
    function nextTrack() {
        if (!playlist.value) return
        if (playlist.value.tracks.length == 0) return

        const currentID = selectedTrackID.value

        if (queuedTrack.value) {
            selectedTrackID.value = queuedTrack.value.id
            queuedTrackID.value = null
            return
        }

        if (playbackType.value == "linear") {
            const index = playlist.value.tracks.findIndex(v => v.id == currentID)
            selectedTrackID.value = playlist.value.tracks[(index + 1) % playlist.value.tracks.length].id
        } else if (playbackType.value == "shuffle") {
            let next: Track | null = null
            let i = 0
            do {
                next = playlist.value.tracks[Math.floor(Math.random() * playlist.value.tracks.length)]
                i++
            } while (history.has(next.id) && i < 1000)

            if (next) {
                selectedTrackID.value = next.id
            } else {
                selectedTrackID.value = playlist.value.tracks[0].id
            }
        }
    }

    return { playlist, selectTrack, nextTrack, playbackType, selectedTrack, selectedTrackID, queuedTrack, selectQueuedTrack }
}