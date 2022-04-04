import { mdiRepeat, mdiShuffle, mdiTrashCan } from "@mdi/js"
import { defineComponent, PropType, ref } from "vue"
import { PlaylistInfo, ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { TextField } from "../../vue3gui/TextField"
import { STATE } from "../State"
import { TrackCard } from "../track/TrackCard"

export const PlaylistSnippetView = (defineComponent({
    name: "PlaylistSnippetView",
    props: {
        playlist: { type: PlaylistInfo, required: true },
        snippet: { type: Array as PropType<Track[]>, required: false }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        async function changeLabel(event: MouseEvent) {
            if (props.playlist.id == ROOT_PLAYLIST_ID) return

            const label = ref(props.playlist.label)
            const popup = await emitter.popup(event.target as HTMLElement, () => (
                <TextField focus placeholder="Playlist label" class="w-200" vModel={label.value} />
            ), {
                align: "over",
                props: {
                    backdropCancels: true
                }
            })

            if (popup && label.value) {
                STATE.callPlaylistAction(props.playlist.id).setLabel({ label: label.value })
            }
        }

        async function deletePlaylist() {
            if (!await emitter.confirm(`Do you really want to delete playlist "${props.playlist.label}"`)) return
            STATE.playlists.deletePlaylist({ playlist: props.playlist.id })
        }

        return () => (
            <div key={`playlist-${props.playlist.id}`} class="flex column border-bottom">
                <h3 class="flex row center-cross">
                    <Button onClick={changeLabel} clear class="mb-1 mr-2">
                        <h3 class="m-0">{props.playlist.label}</h3>
                    </Button>
                    <Button to={`/playlist/${props.playlist.id}`} clear> <Icon icon={mdiShuffle} /> </Button>
                    <Button to={`/playlist/${props.playlist.id}?type=linear`} clear> <Icon icon={mdiRepeat} /> </Button>
                    {props.playlist.id != ROOT_PLAYLIST_ID && <Button onClick={deletePlaylist} clear> <Icon icon={mdiTrashCan} /> </Button>}
                </h3>
                <div class="flex-basis-150">
                    {props.snippet == null ? (
                        <div class="absolute-fill flex center">
                            <LoadingIndicator />
                        </div>
                    ) : props.snippet.length > 0 ? (
                        <div class="absolute-fill flex row pb-2 overflow-hidden">
                            {props.snippet.map(track => (
                                <TrackCard to={`/playlist/${props.playlist.id}?track=${track.id}`} track={track} key={track.id} />
                            ))}
                        </div>
                    ) : (
                        <div class="absolute-fill flex center">
                            <div class="muted">Playlist empty</div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}))