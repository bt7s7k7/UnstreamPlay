import { mdiDownload, mdiReload, mdiShuffle } from "@mdi/js"
import { computed, defineComponent } from "vue"
import { Button } from "../vue3gui/Button"
import { Icon } from "../vue3gui/Icon"
import { LoadingIndicator } from "../vue3gui/LoadingIndicator"
import { asyncComputed } from "../vue3gui/util"
import { STATE } from "./State"
import { TrackCard } from "./track/TrackCard"
import { useTrackImporter } from "./track/TrackImporterView"
import icon from "/favicon.ico"

export const HomeScreen = (defineComponent({
    name: "HomeScreen",
    setup(props, ctx) {
        const playlists = computed(() => STATE.playlists.playlists)
        const snippets = asyncComputed(() => { }, () => STATE.playlists.getPlaylistsSnippet())

        const openTrackImporter = useTrackImporter()

        return () => (
            <div class="flex-fill flex column center-cross bg-black-transparent">
                <div class="flex column center-cross bg-dark w-fill">
                    <div class="flex row center-cross my-4 as-page">
                        <img src={icon} class="h-fill mr-2" />
                        <h1 class="flex-fill m-0">UnstreamPlayer</h1>
                        <Button onClick={openTrackImporter} clear> <Icon icon={mdiDownload} /> Import tracks </Button>
                    </div>
                </div>
                <div class="flex column as-page">
                    {[...playlists.value.values()].map((playlist) => (
                        <div class="flex column border-bottom">
                            <h3 class="flex row center-cross">
                                <div class="mb-1 mr-2">
                                    {playlist.label}
                                </div>
                                <Button clear> <Icon icon={mdiShuffle} /> </Button>
                                <Button clear> <Icon icon={mdiReload} /> </Button>
                            </h3>
                            <div class="flex-basis-150">
                                {snippets.value == null ? (
                                    <div class="absolute-fill flex center">
                                        <LoadingIndicator />
                                    </div>
                                ) : snippets.value.get(playlist.id)?.length as number > 0 ? (
                                    <div class="absolute-fill flex row pb-2">
                                        {snippets.value.get(playlist.id)!.map(track => (
                                            <TrackCard track={track} key={track.id} />
                                        ))}
                                    </div>
                                ) : (
                                    <div class="absolute-fill flex center">
                                        <div class="muted">Playlist empty</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
}))