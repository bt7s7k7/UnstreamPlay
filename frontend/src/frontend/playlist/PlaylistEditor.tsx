import { mdiMinusBoxMultiple, mdiPlaylistMusic } from "@mdi/js"
import { defineComponent } from "vue"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { STATE } from "../State"
import { PlaylistProxy } from "./PlaylistProxy"

export const PlaylistEditor = (defineComponent({
    name: "PlaylistEditor",
    props: {
        playlist: { type: PlaylistProxy, required: true }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        async function clearAllTracks() {
            if (!await emitter.confirm("Do you really want do remove all tracks from this playlist?")) return
            props.playlist.removeAllTracks()
        }

        function copyTracksFrom(id: string) {
            props.playlist.copyTracksFrom({ playlist: id })
        }

        return () => (
            <div class="flex column flex-fill gap-2">
                <div class="border rounded flex row px-2 py-1 gap-2 center-cross">
                    <small>Actions:</small>
                    <Button onClick={clearAllTracks} clear> <Icon icon={mdiMinusBoxMultiple} /> Remove all tracks </Button>
                </div>
                <div>Copy tracks from:</div>
                <div class="flex-fill">
                    <div class="absolute-fill scroll flex column">
                        {[...STATE.playlists.playlists.values()].map(playlist => playlist.id != props.playlist.id && (
                            <Button onClick={() => copyTracksFrom(playlist.id)} class="text-left" key={playlist.id} clear> <Icon icon={mdiPlaylistMusic} /> {playlist.label} </Button>
                        ))}
                    </div>
                </div>

            </div>
        )
    }
}))
