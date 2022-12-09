import { mdiCog, mdiRepeat, mdiShuffle, mdiSkipNext } from "@mdi/js"
import { defineComponent, onMounted, onUnmounted, PropType, ref, watch } from "vue"
import { SpeakerCommand, SpeakerSync } from "../../common/Speaker"
import { Track } from "../../common/Track"
import { eventDecorator } from "../../eventDecorator"
import { Button } from "../../vue3gui/Button"
import { Icon } from "../../vue3gui/Icon"
import { useEventListener } from "../../vue3gui/util"
import { getIconURL, getTrackURL } from "../constants"
import { PlaybackType } from "../playlist/usePlaylist"
import { STATE } from "../State"
import { useAdvancedAudio } from "./AdvancedAudio"
import { TrackListEntry } from "./TrackListEntry"
import { TrackView } from "./TrackView"

export const TrackPlayer = eventDecorator(defineComponent({
    name: "TrackPlayer",
    props: {
        selectedTrack: { type: Track },
        playbackType: { type: String as PropType<PlaybackType>, required: true },
        playlistID: { type: String },
        authoritative: { type: Boolean },
        queuedTrack: { type: Track }
    },
    emits: {
        nextTrack: () => true,
        selectTrack: (id: string) => true,
        playbackTypeChange: (type: PlaybackType) => true,
        queuedTrackChange: (id: string | null) => true
    },
    setup(props, ctx) {
        const audio = ref<HTMLAudioElement>()
        const advancedAudio = useAdvancedAudio(audio)

        function sendCommand(type: SpeakerCommand["key"] | "sync") {
            if (justSynced.value) return
            if (!STATE.speakerManager.connected) return

            if (props.selectedTrack == null || props.playlistID == null) {
                return
            }

            if (STATE.speakerManager.connected.isOwner) {
                STATE.speakerManager.sendSync(new SpeakerSync({
                    playback: props.playbackType,
                    playlist: props.playlistID,
                    playing: !audio.value!.paused,
                    time: audio.value!.currentTime,
                    track: props.selectedTrack.id,
                    queuedTrack: props.queuedTrack?.id
                }))
            } else {
                if (type == "playback") STATE.speakerManager.sendCommand({ key: "playback", value: props.playbackType })
                if (type == "playlist") STATE.speakerManager.sendCommand({ key: "playlist", value: props.playlistID })
                if (type == "playing") STATE.speakerManager.sendCommand({ key: "playing", value: !audio.value!.paused })
                if (type == "time") STATE.speakerManager.sendCommand({ key: "time", value: audio.value!.currentTime })
                if (type == "track") STATE.speakerManager.sendCommand({ key: "track", value: props.selectedTrack.id })
                if (type == "queuedTrack") STATE.speakerManager.sendCommand({ key: "queuedTrack", value: props.queuedTrack?.id ?? null })
            }
        }

        watch(() => props.selectedTrack, (selectedTrack, old) => {
            if (!navigator.mediaSession) return
            if (selectedTrack == old) return

            if (selectedTrack) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: selectedTrack.label,
                    artist: selectedTrack.author,
                    artwork: [
                        { src: getIconURL(selectedTrack.icon) }
                    ]
                })
            } else {
                navigator.mediaSession.metadata = null
            }

            sendCommand("playlist")
            sendCommand("track")
        })

        watch(() => props.queuedTrack, (queuedTrack, old) => {
            if (queuedTrack == old) return

            sendCommand("queuedTrack")
        })

        onMounted(() => {
            navigator.mediaSession.setActionHandler("pause", () => audio.value?.pause())
            navigator.mediaSession.setActionHandler("play", () => audio.value?.play())
            navigator.mediaSession.setActionHandler("nexttrack", () => ctx.emit("nextTrack"))
            navigator.mediaSession.setActionHandler("previoustrack", () => void 0)
        })

        onUnmounted(() => {
            navigator.mediaSession.setActionHandler("pause", null)
            navigator.mediaSession.setActionHandler("play", null)
            navigator.mediaSession.setActionHandler("nexttrack", null)
            navigator.mediaSession.setActionHandler("previoustrack", null)
            navigator.mediaSession.metadata = null
        })

        let interval: number
        let justSyncedTimeout: number
        onMounted(() => {
            interval = setInterval(() => {
                if (props.authoritative) {
                    sendCommand("sync")
                }
            }, 500)
        })
        onUnmounted(() => {
            clearInterval(interval)
            clearTimeout(justSyncedTimeout)
        })

        const justSynced = ref(false)
        useEventListener(STATE.speakerManager.onSync.add(null, sync => {
            justSynced.value = true
            if (justSyncedTimeout) clearTimeout(justSyncedTimeout)
            justSyncedTimeout = setTimeout(() => {
                justSynced.value = false
            }, 10)

            if (sync == null) return
            if (sync.playback != props.playbackType) ctx.emit("playbackTypeChange", sync.playback)

            if (sync.playlist == props.playlistID) {
                if (sync.track != props.selectedTrack?.id) ctx.emit("selectTrack", sync.track)
            }

            if (sync.queuedTrack != props.queuedTrack?.id) {
                ctx.emit("queuedTrackChange", sync.queuedTrack ?? null)
            }

            if (audio.value) {
                if (sync.playing != !audio.value.paused) {
                    if (sync.playing) audio.value.play()
                    else audio.value.pause()
                }

                if (Math.abs(audio.value.currentTime - sync.time) > 0.5) {
                    audio.value.currentTime = Math.max(0, sync.time - 0.1)
                }
            }
        }))

        useEventListener(STATE.speakerManager.onCommand.add(null, command => {
            justSynced.value = true
            if (justSyncedTimeout) clearTimeout(justSyncedTimeout)
            justSyncedTimeout = setTimeout(() => {
                justSynced.value = false
            }, 10)

            if (command == null) {
                STATE.speakerManager.sendSync(null)
                return
            }
            if (command.key == "playback" && command.value != props.playbackType) ctx.emit("playbackTypeChange", command.value)
            if (command.key == "track" && command.value != props.selectedTrack?.id) ctx.emit("selectTrack", command.value)
            if (command.key == "queuedTrack" && command.value != props.queuedTrack?.id) ctx.emit("queuedTrackChange", command.value)

            if (audio.value) {
                if (command.key == "playing" && command.value != !audio.value.paused) {
                    if (command.value) audio.value.play()
                    else audio.value.pause()
                }

                if (command.key == "time") {
                    audio.value.currentTime = command.value - 0.1
                }
            }
        }))

        return () => (
            <TrackView track={props.selectedTrack ?? undefined}>
                <>
                    <div class="flex row center-cross">
                        <div class="flex-fill as-audio-wrapper">
                            <audio
                                onEnded={() => (STATE.speakerManager.connected == null || props.authoritative) && ctx.emit("nextTrack")}
                                onPlay={() => sendCommand("playing")}
                                onPause={() => sendCommand("playing")}
                                onSeeking={() => sendCommand("time")}
                                src={getTrackURL(props.selectedTrack?.url)}
                                muted={STATE.speakerManager.connected != null && props.authoritative == false}
                                autoplay controls ref={audio}
                            />
                        </div>
                        <Button onClick={advancedAudio.openSettings} class="absolute as-advanced-audio-button" small clear> <Icon icon={mdiCog} /> </Button>
                        <div class="pb-1">
                            <Button onClick={() => ctx.emit("playbackTypeChange", "shuffle")} class={props.playbackType == "linear" && "muted"} clear> <Icon icon={mdiShuffle} /> </Button>
                            <Button onClick={() => ctx.emit("playbackTypeChange", "linear")} class={props.playbackType == "shuffle" && "muted"} clear> <Icon icon={mdiRepeat} /> </Button>
                            <Button onClick={() => ctx.emit("nextTrack")} clear> <Icon icon={mdiSkipNext} /> </Button>
                        </div>
                    </div>

                    {props.queuedTrack && <div class="rounded border p-1 px-2 flex row gap-2 center-cross mx-2">
                        <small>Up next:</small>
                        <TrackListEntry
                            onClick={() => { ctx.emit("selectTrack", props.queuedTrack!.id); ctx.emit("queuedTrackChange", null) }}
                            track={props.queuedTrack}
                            class="flex-fill" noRemoveButton
                        />
                    </div>}
                </>
            </TrackView>
        )
    }
}))