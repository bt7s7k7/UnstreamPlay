import { mdiCastAudio, mdiClose, mdiContentCopy, mdiDownload, mdiMagnify, mdiPlaylistMusic } from "@mdi/js"
import { computed, defineComponent, ref, toRaw } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { TextField } from "../../vue3gui/TextField"
import { useDebounce, useEventListener } from "../../vue3gui/util"
import { useCastModal } from "../speaker/CastModal"
import { STATE } from "../State"
import { useTrackImporter } from "../track/TrackImporterView"
import { TrackListEntry } from "../track/TrackListEntry"
import { TrackPlayer } from "../track/TrackPlayer"
import { useTitle } from "../useTitle"
import { PlaylistEditor } from "./PlaylistEditor"
import { usePlaylist } from "./usePlaylist"

export const PlaylistScreen = (defineComponent({
    name: "PlaylistScreen",
    setup(props, ctx) {
        const route = useRoute()
        const router = useRouter()
        const openTrackImporter = useTrackImporter()
        const emitter = useDynamicsEmitter()
        const syncBlocked = ref(false)

        const params = computed(() => ({
            playlistID: route.params.playlist as string,
            type: route.query.type as string | null,
            track: route.query.track as string | null
        }))

        const { playlist, selectedTrackID, playbackType, selectedTrack, nextTrack, selectTrack, queuedTrack, selectQueuedTrack } = usePlaylist(computed(() => params.value.playlistID))

        const searchQuery = ref("")
        const searchQueryDebounced = useDebounce(searchQuery, { delay: 100 })
        const tracks = computed(() => {
            if (!playlist.value) return []

            const query = searchQueryDebounced.value.toLowerCase()
            if (!query) return playlist.value.tracks

            return toRaw(playlist.value.tracks).filter(v => v.author.toLowerCase().includes(query) || v.label.toLowerCase().includes(query))
        })

        if (params.value.track || params.value.type) {
            if (params.value.track) {
                selectedTrackID.value = params.value.track
                if (STATE.speakerManager.connected) syncBlocked.value = true
            }

            if (params.value.type && ["shuffle", "linear"].includes(params.value.type)) playbackType.value = params.value.type as never

            router.replace(`/playlist/${params.value.playlistID}`)
        }

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

        const { casting, openCastModal, disconnect } = useCastModal()

        useEventListener(STATE.speakerManager.onSync.add(null, sync => {
            if (syncBlocked.value) {
                syncBlocked.value = false
                return
            }

            if (sync == null) {
                router.push("/")
                return
            }

            if (sync.playlist != params.value.playlistID) {
                router.push(`/playlist/${sync.playlist}`)
            }
        }))

        return () => (
            <Overlay class="flex-fill flex as-playlist-screen" show={playlist.value == null}>{{
                overlay: () => <LoadingIndicator />,
                default: () => <>
                    <div class="panel flex column">
                        <TrackPlayer
                            playbackType={playbackType.value}
                            playlistID={playlist.value?.id}
                            selectedTrack={selectedTrack.value!}
                            onNextTrack={nextTrack}
                            onSelectTrack={selectTrack}
                            onPlaybackTypeChange={v => playbackType.value = v}
                            queuedTrack={queuedTrack.value ?? undefined}
                            onQueuedTrackChange={v => selectQueuedTrack(v)}
                        />
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
                            {casting.value == null ? (
                                <Button onClick={openCastModal} clear class="p-2">
                                    <h3 class="m-0">
                                        <Icon icon={mdiCastAudio} />
                                    </h3>
                                </Button>
                            ) : (
                                <Button variant="success" class="my-1" onClick={disconnect}>
                                    <h3 class="m-0 flex row gap-2 center-cross">
                                        <Icon icon={mdiCastAudio} />
                                        {casting.value}
                                    </h3>
                                </Button>
                            )}
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
                            <h3 class="m-0 user-select-none" onClick={() => searchQuery.value = ""}>
                                <Icon icon={mdiMagnify} />
                                {searchQuery.value != "" && <Icon class="absolute bottom-0 left-0 small text-danger" icon={mdiClose} />}
                            </h3>
                            <TextField vModel={searchQuery.value} noIndicator clear class="flex-fill" placeholder="Search" />
                        </div>
                        <div class="flex-fill bg-black-transparent">
                            <div class="absolute-fill scroll">
                                {tracks.value.map(track => (
                                    <TrackListEntry
                                        onRemove={() => removeTrack(track)}
                                        onClick={(event) => event.shiftKey ? selectQueuedTrack(track.id) : selectTrack(track.id)}
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