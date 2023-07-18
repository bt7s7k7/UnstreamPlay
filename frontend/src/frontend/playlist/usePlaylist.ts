import { computed, onUnmounted, Ref, ref } from "vue"
import { DISPOSE } from "../../eventLib/Disposable"
import { asyncComputed } from "../../vue3gui/util"
import { STATE } from "../State"

export type PlaybackType = "shuffle" | "linear"

export function usePlaylist(playlistID: Ref<string | null>) {
    const playlist = asyncComputed(() => playlistID.value, async (playlistID) => playlistID ? STATE.findPlaylist(playlistID) : null, {
        finalizer: v => v?.[DISPOSE](),
        onSuccess() {
            shuffleBuffer = null
        }
    })
    onUnmounted(() => playlist.value?.[DISPOSE]())

    let shuffleBuffer: string[] | null = null

    const selectedTrackID = ref<string | null>(null)
    function selectTrack(id: string) {
        selectedTrackID.value = id
        if (shuffleBuffer != null) {
            const index = shuffleBuffer.indexOf(id)
            if (index != -1) shuffleBuffer.splice(index, 1)
        }
    }

    const selectedTrack = computed(() => selectedTrackID.value ? playlist.value?.tracks.find(v => v.id == selectedTrackID.value) : null)

    const queuedTrackID = ref<string | null>(null)
    const queuedTrack = computed(() => queuedTrackID.value ? playlist.value?.tracks.find(v => v.id == queuedTrackID.value) : null)
    function selectQueuedTrack(id: string | null) {
        queuedTrackID.value = id
    }

    const playbackType = ref<PlaybackType>("shuffle")

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
            if (shuffleBuffer == null || shuffleBuffer.length == 0) {
                shuffleBuffer = playlist.value.tracks.map(v => v.id)

                for (let i = shuffleBuffer.length; i != 0;) {
                    const randomIndex = Math.floor(Math.random() * i)
                    i--;

                    [shuffleBuffer[i], shuffleBuffer[randomIndex]] = [shuffleBuffer[randomIndex], shuffleBuffer[i]]
                }
            }

            selectedTrackID.value = shuffleBuffer.shift()!
        }
    }

    return { playlist, selectTrack, nextTrack, playbackType, selectedTrack, selectedTrackID, queuedTrack, selectQueuedTrack }
}
