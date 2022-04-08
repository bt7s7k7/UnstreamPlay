import { mdiContentCopy, mdiDownload, mdiMagnify, mdiPlaylistMusic, mdiRepeat, mdiShuffle, mdiSkipNext } from "@mdi/js"
import { computed, defineComponent, onMounted, onUnmounted, ref, toRaw, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { DISPOSE } from "../../eventLib/Disposable"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { TextField } from "../../vue3gui/TextField"
import { asyncComputed, useDebounce } from "../../vue3gui/util"
import { getIconURL, getTrackURL } from "../constants"
import { STATE } from "../State"
import { useTrackImporter } from "../track/TrackImporterView"
import { TrackListEntry } from "../track/TrackListEntry"
import { TrackView } from "../track/TrackView"
import { useTitle } from "../useTitle"
import { PlaylistEditor } from "./PlaylistEditor"

export const PlaylistScreen = (defineComponent({
    name: "PlaylistScreen",
    setup(props, ctx) {
        const route = useRoute()
        const router = useRouter()
        const openTrackImporter = useTrackImporter()
        const emitter = useDynamicsEmitter()

        const params = computed(() => ({
            playlistID: route.params.playlist as string,
            type: route.query.type as string | null,
            track: route.query.track as string | null
        }))
        const playlist = asyncComputed(() => params.value.playlistID, async (playlistID) => playlistID ? STATE.findPlaylist(playlistID) : null, {
            finalizer: v => v?.[DISPOSE](),
            onSuccess() {
                history.clear()
            }
        })
        onUnmounted(() => playlist.value?.[DISPOSE]())

        const searchQuery = ref("")
        const searchQueryDebounced = useDebounce(searchQuery, { delay: 100 })
        const tracks = computed(() => {
            if (!playlist.value) return []

            const query = searchQueryDebounced.value.toLowerCase()
            if (!query) return playlist.value.tracks

            return toRaw(playlist.value.tracks).filter(v => v.author.toLowerCase().includes(query) || v.label.toLowerCase().includes(query))
        })

        const audio = ref<HTMLAudioElement>()

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

        const playbackType = ref<"shuffle" | "linear">("shuffle")

        if (params.value.track || params.value.type) {
            if (params.value.track) selectedTrackID.value = params.value.track
            if (params.value.type && ["shuffle", "linear"].includes(params.value.type)) playbackType.value = params.value.type as never

            router.replace(`/playlist/${params.value.playlistID}`)
        }

        const history = new Set<string>()
        function nextTrack() {
            if (!playlist.value) return
            if (playlist.value.tracks.length == 0) return

            const currentID = selectedTrackID.value

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

        watch(() => selectedTrack.value, (selectedTrack) => {
            if (!navigator.mediaSession) return

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
        })

        onMounted(() => {
            navigator.mediaSession.setActionHandler("pause", () => audio.value?.pause())
            navigator.mediaSession.setActionHandler("play", () => audio.value?.play())
            navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack())
            navigator.mediaSession.setActionHandler("previoustrack", () => void 0)
        })

        onUnmounted(() => {
            navigator.mediaSession.setActionHandler("pause", null)
            navigator.mediaSession.setActionHandler("play", null)
            navigator.mediaSession.setActionHandler("nexttrack", null)
            navigator.mediaSession.setActionHandler("previoustrack", null)
            navigator.mediaSession.metadata = null
        })

        useTitle(computed(() => (selectedTrack.value ? selectedTrack.value.label + " - " : "") + playlist.value?.label))


        async function removeTrack(track: Track) {
            if (!playlist.value) return

            if (playlist.value.id == ROOT_PLAYLIST_ID) {
                if (!await emitter.confirm(`Do you want to permanently delete track "${track.author} - ${track.label}"`)) return
                await STATE.trackEditor.deleteTrack({ track: track.id })
                return
            }

            await playlist.value.removeTrack({ track: track.id })
        }

        function openPlaylistEditor() {
            emitter.modal(PlaylistEditor, {
                contentProps: {
                    playlist: playlist.value
                },
                props: {
                    cancelButton: "Close",
                    class: "w-300 h-500"
                }
            })
        }

        return () => (
            <Overlay class="flex-fill flex row" show={playlist.value == null}>{{
                overlay: () => <LoadingIndicator />,
                default: () => <>
                    <div class="flex-basis-500 flex column">
                        <TrackView track={selectedTrack.value ?? undefined}>
                            <div class="flex row center-cross">
                                <div class="flex-fill as-audio-wrapper">
                                    <audio onEnded={nextTrack} autoplay src={getTrackURL(selectedTrack.value?.url)} controls ref={audio} />
                                </div>
                                <div class="pb-1">
                                    <Button onClick={() => playbackType.value = "shuffle"} class={playbackType.value == "linear" && "muted"} clear> <Icon icon={mdiShuffle} /> </Button>
                                    <Button onClick={() => playbackType.value = "linear"} class={playbackType.value == "shuffle" && "muted"} clear> <Icon icon={mdiRepeat} /> </Button>
                                    <Button onClick={nextTrack} clear> <Icon icon={mdiSkipNext} /> </Button>
                                </div>
                            </div>
                        </TrackView>
                    </div>
                    <div class="flex-fill flex column">
                        <div class="flex row flex-basis-9 border-bottom">
                            <Button to="/" clear class="flex-fill text-left pt-2">
                                <h3 class="m-0">
                                    <Icon icon={mdiPlaylistMusic} />
                                    {" "}
                                    {playlist.value?.label}
                                </h3>
                            </Button>
                            {params.value.playlistID != ROOT_PLAYLIST_ID && <Button onClick={openPlaylistEditor} clear class="p-2">
                                <h3 class="m-0">
                                    <Icon icon={mdiContentCopy} />
                                </h3>
                            </Button>}
                            <Button onClick={openTrackImporter} clear class="p-2">
                                <h3 class="m-0">
                                    <Icon icon={mdiDownload} />
                                </h3>
                            </Button>
                        </div>
                        <div class="flex row flex-basis-9 center-cross p-2 gap-2 border-bottom">
                            <h3 class="m-0"> <Icon icon={mdiMagnify} /> </h3>
                            <TextField vModel={searchQuery.value} noIndicator clear class="flex-fill" placeholder="Search" />
                        </div>
                        <div class="flex-fill bg-black-transparent">
                            <div class="absolute-fill scroll">
                                {tracks.value.map(track => (
                                    <TrackListEntry
                                        onRemove={() => removeTrack(track)}
                                        onClick={() => selectTrack(track.id)}
                                        key={track.id}
                                        active={track.id == selectedTrackID.value}
                                        class="w-fill p-2"
                                        track={track}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            }}</Overlay>
        )
    }
}))