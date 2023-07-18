import { mdiCog, mdiPause, mdiPlay, mdiRepeat, mdiShuffle, mdiSkipNext, mdiSpeaker, mdiSync, mdiSyncOff, mdiVolumeHigh, mdiVolumeOff } from "@mdi/js"
import { PropType, computed, defineComponent, onMounted, onUnmounted, ref, watch } from "vue"
import { SpeakerCommand, SpeakerSync } from "../../common/Speaker"
import { Track } from "../../common/Track"
import { eventDecorator } from "../../eventDecorator"
import { Button } from "../../vue3gui/Button"
import { Icon } from "../../vue3gui/Icon"
import { Slider } from "../../vue3gui/Slider"
import { useEventListener } from "../../vue3gui/util"
import { STATE } from "../State"
import { getIconURL, getTrackURL } from "../constants"
import { PlaybackType } from "../playlist/usePlaylist"
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
        const audio = ref<HTMLAudioElement>(null!)
        const advancedAudio = useAdvancedAudio(audio)
        const allowPlayback = computed(() => STATE.speakerManager.connected == null || props.authoritative)

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
                    playing: playing.value,
                    time: time.value,
                    track: props.selectedTrack.id,
                    queuedTrack: props.queuedTrack?.id
                }))
            } else {
                if (type == "playback") STATE.speakerManager.sendCommand({ key: "playback", value: props.playbackType })
                if (type == "playlist") STATE.speakerManager.sendCommand({ key: "playlist", value: props.playlistID })
                if (type == "playing") STATE.speakerManager.sendCommand({ key: "playing", value: playing.value })
                if (type == "time") STATE.speakerManager.sendCommand({ key: "time", value: time.value })
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
            navigator.mediaSession.setActionHandler("pause", () => pause())
            navigator.mediaSession.setActionHandler("play", () => play())
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
                    if (sync.playing) play(true)
                    else pause(true)
                }

                if (Math.abs(audio.value.currentTime - sync.time) > 0.5) {
                    seek(Math.max(0, sync.time - 0.1), true)
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
                    if (command.value) play()
                    else pause()
                }

                if (command.key == "time") {
                    seek(command.value - 0.1)
                }
            }
        }))

        const playing = ref(false)
        const time = ref(0)
        const timeMax = ref(0)
        const volume = ref(0)
        const volumeEditing = ref(false)
        const muted = ref(false)
        const loop = ref(false)

        function getMetadata() {
            getTime()
            volume.value = audio.value.volume
            if (allowPlayback.value) {
                muted.value = audio.value.muted
            } else {
                muted.value = audio.value.muted = true
            }
            playing.value = !audio.value.paused
            loop.value = audio.value.loop
        }

        useEventListener("interval", 500, getMetadata)

        function togglePlay() {
            if (playing.value) pause()
            else play()
        }

        function play(ignore = false) {
            playing.value = true
            audio.value.play()
            if (!ignore) sendCommand("playing")
        }

        function pause(ignore = false) {
            playing.value = false
            audio.value.pause()
            if (!ignore) sendCommand("playing")
        }

        function getTime() {
            time.value = audio.value.currentTime
            timeMax.value = audio.value.duration
            if (isNaN(timeMax.value)) {
                time.value = 0
                timeMax.value = 0
            }
        }

        function formatTime(seconds: number) {
            return `${seconds / 60 | 0}:${(seconds % 60 | 0).toString().padStart(2, "0")}`
        }

        function seek(newTime: number, ignore = false) {
            audio.value.currentTime = newTime
            time.value = newTime
            if (!ignore) sendCommand("time")
        }

        function setVolume(value: number) {
            volume.value = value
            audio.value.volume = value
            muted.value = audio.value.muted = false
        }

        function toggleMute() {
            if (allowPlayback.value) {
                muted.value = audio.value.muted = !audio.value.muted
            } else {
                muted.value = audio.value.muted = true
            }
        }

        function toggleLoop() {
            loop.value = audio.value.loop = !audio.value.loop
        }

        return () => (
            <TrackView track={props.selectedTrack ?? undefined}>
                <>
                    <audio
                        ref={audio} autoplay
                        onEnded={() => (STATE.speakerManager.connected == null || props.authoritative) && ctx.emit("nextTrack")}
                        onLoadedmetadata={getMetadata}
                        src={getTrackURL(props.selectedTrack?.url)}
                    />

                    <div class="flex row center-cross mt-2 mb-2">
                        <Button clear onClick={togglePlay}> <Icon icon={playing.value ? mdiPause : mdiPlay} /> </Button>
                        <div style="width: 75px" class="text-center user-select-none small mr-2">{formatTime(time.value)} / {formatTime(timeMax.value)}</div>
                        <Slider
                            disabled={timeMax.value == 0}
                            modelValue={timeMax.value == 0 ? 0 : time.value / timeMax.value}
                            onInput={value => seek(value * timeMax.value)}
                            step={timeMax.value == 0 ? 0.1 : 5 / timeMax.value}
                            class="flex-fill"
                            variant="white"
                        />
                        <div class={["as-volume-editor hover-check flex row center-cross rounded ml-1", volumeEditing.value && "hover-check-force"]}>
                            {allowPlayback.value && <Button class="if-hover" clear onClick={toggleLoop}> <Icon icon={loop.value ? mdiSync : mdiSyncOff} /> </Button>}
                            <Button onClick={advancedAudio.openSettings} class="if-hover" clear> <Icon icon={mdiCog} /> </Button>
                            {allowPlayback.value && <Slider
                                class="if-hover ml-2 mr-4"
                                style="width: 50px"
                                modelValue={volume.value}
                                onInput={setVolume}
                                onDragStart={() => volumeEditing.value = true}
                                onDragEnd={() => setTimeout(() => volumeEditing.value = false, 10)}
                            />}
                            <Button clear onClick={toggleMute}> <Icon icon={allowPlayback.value == false ? mdiSpeaker : volume.value == 0 ? mdiVolumeOff : mdiVolumeHigh} /> </Button>
                        </div>
                        <Button onClick={() => ctx.emit("playbackTypeChange", "shuffle")} class={props.playbackType == "linear" && "muted"} clear> <Icon icon={mdiShuffle} /> </Button>
                        <Button onClick={() => ctx.emit("playbackTypeChange", "linear")} class={props.playbackType == "shuffle" && "muted"} clear> <Icon icon={mdiRepeat} /> </Button>
                        <Button onClick={() => ctx.emit("nextTrack")} clear> <Icon icon={mdiSkipNext} /> </Button>
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
