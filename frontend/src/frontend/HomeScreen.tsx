import { mdiCastAudio, mdiDownload, mdiPlus, mdiSpeaker } from "@mdi/js"
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { EventListener } from "../eventLib/EventListener"
import { Button } from "../vue3gui/Button"
import { useDynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { Icon } from "../vue3gui/Icon"
import { TextField } from "../vue3gui/TextField"
import { asyncComputed, useEventListener } from "../vue3gui/util"
import { PlaylistSnippetView } from "./playlist/PlaylistSnippetView"
import { useCastModal } from "./speaker/CastModal"
import { STATE } from "./State"
import { useTrackImporter } from "./track/TrackImporterView"
import { useTitle } from "./useTitle"
import icon from "/favicon.ico"

export const HomeScreen = (defineComponent({
    name: "HomeScreen",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()
        const playlists = computed(() => STATE.playlists.playlists)
        const snippets = asyncComputed(() => { }, () => STATE.playlists.getPlaylistsSnippet(), { persist: true })
        const router = useRouter()
        useTitle("")

        const listener = new EventListener()
        onUnmounted(() => listener.dispose())
        STATE.onPlaylistsProbablyChanged.add(listener, () => {
            snippets.reload()
        })

        watch(() => playlists.value.size, () => {
            snippets.reload()
        })

        const openTrackImporter = useTrackImporter()

        async function createPlaylist(event: MouseEvent) {
            const name = ref("")
            const popup = await emitter.popup(event.target as HTMLElement, () => (
                <TextField focus placeholder="Playlist label" class="w-200" vModel={name.value} />
            ), {
                align: "over",
                props: {
                    backdropCancels: true
                }
            })

            if (popup && name.value) {
                await STATE.playlists.createPlaylist({ label: name.value })
                snippets.reload()
            }
        }

        const { casting, disconnect, openCastModal } = useCastModal()

        onMounted(() => {
            if (casting.value != null) {
                if (STATE.speakerManager.lastSync == null) return
                STATE.speakerManager.sendSync(null)
            }
        })

        useEventListener(STATE.speakerManager.onSync.add(null, sync => {
            if (sync == null) return
            router.push(`/playlist/${sync.playlist}`)
        }))

        return () => (
            <div class="flex-fill flex column center-cross bg-black-transparent">
                <div class="flex column center-cross bg-dark w-fill">
                    <div class="flex row center-cross my-4 as-page">
                        <img src={icon} class="h-fill mr-2" />
                        <h1 class="flex-fill m-0">UnstreamPlayer</h1>
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
                        <Button onClick={openTrackImporter} clear> <Icon icon={mdiDownload} /> Import tracks </Button>
                    </div>
                </div>
                <div class="flex column as-page">
                    {[...playlists.value.values()].map((playlist) => (
                        <PlaylistSnippetView key={`playlist-${playlist.id}`} playlist={playlist} snippet={snippets.value?.get(playlist.id)} />
                    ))}
                    <div class="mt-4">
                        <Button onClick={createPlaylist} clear> <Icon icon={mdiPlus} /> Create playlist </Button>
                        <Button to="/speaker" clear> <Icon icon={mdiSpeaker} /> Speaker mode </Button>
                    </div>
                </div>
            </div>
        )
    }
}))