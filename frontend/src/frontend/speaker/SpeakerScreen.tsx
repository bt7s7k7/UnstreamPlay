import { defineComponent, onMounted, onUnmounted, ref } from "vue"
import { Button } from "../../vue3gui/Button"
import { Overlay } from "../../vue3gui/Overlay"
import { useEventListener } from "../../vue3gui/util"
import { usePlaylist } from "../playlist/usePlaylist"
import { STATE } from "../State"
import { TrackPlayer } from "../track/TrackPlayer"
import icon from "/favicon.ico"

export const SpeakerScreen = (defineComponent({
    name: "SpeakerScreen",
    setup(props, ctx) {
        const label = ref<string | null>(null)
        const playlistID = ref<string | null>(null)

        onMounted(() => {
            const connected = STATE.speakerManager.connected
            if (connected) {
                label.value = STATE.speakerManager.speakers.get(connected.id)!
            } else {
                STATE.speakerManager.init().then(result => label.value = result.label)
            }
        })

        onUnmounted(() => {
            STATE.speakerManager.disconnect()
        })

        useEventListener(STATE.speakerManager.onSync.add(null, (sync) => {
            if (sync == null) {
                playlistID.value = null
                return
            }

            if (sync.playlist != playlist.value?.id) {
                playlistID.value = sync.playlist
            }
        }))

        const { playbackType, selectedTrack, nextTrack, playlist, selectTrack } = usePlaylist(playlistID)

        return () => (
            <div class="flex-fill flex column center bg-black-transparent">
                <Button class="absolute top-0 left-0" to="/" clear>
                    <img src={icon} class="h-fill" />
                </Button>

                <Overlay loading class="bg-dark p-4 rounded as-speaker-panel flex column" show={label.value == null}>
                    <TrackPlayer
                        playbackType={playbackType.value}
                        selectedTrack={selectedTrack.value!}
                        playlistID={playlist.value?.id}
                        onNextTrack={nextTrack}
                        onSelectTrack={selectTrack}
                        onPlaybackTypeChange={v => playbackType.value = v}
                        class="flex-fill" authoritative
                    />
                    <div>{label.value && `Speaker label: ${label.value}`}</div>
                </Overlay>
            </div>
        )
    }
}))