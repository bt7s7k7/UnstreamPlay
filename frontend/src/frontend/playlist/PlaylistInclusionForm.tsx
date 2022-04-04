import { mdiCheckboxBlankOutline, mdiCheckboxMarkedOutline, mdiPlus } from "@mdi/js"
import { defineComponent, reactive, ref } from "vue"
import { ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { TextField } from "../../vue3gui/TextField"
import { STATE } from "../State"

export const PlaylistInclusionForm = (defineComponent({
    name: "PlaylistInclusionForm",
    props: {
        track: { type: Track, required: false },
        editImported: { type: Boolean }
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const included = reactive(new Set<string>())
        const loading = ref(false)

        function reloadPlaylists() {
            included.clear()
            if (props.track) loading.value = true

            if (props.track) {
                STATE.playlists.getPlaylistsWithTrack({ track: props.track.id }).then(playlists => {
                    for (const playlist of playlists) {
                        included.add(playlist)
                    }

                    loading.value = false
                })
            }
        }

        reloadPlaylists()

        async function newPlaylist(event: MouseEvent) {
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
                reloadPlaylists()
            }
        }

        async function togglePlaylist(id: string) {
            if (included.has(id)) {
                if (props.track) {
                    await STATE.callPlaylistAction(id).removeTrack({ track: props.track.id })
                }

                if (props.editImported) {
                    await STATE.callPlaylistAction(id).removeTrack({ track: "$imported" })
                }

                included.delete(id)
            } else {
                if (props.track) {
                    await STATE.callPlaylistAction(id).addTrack({ track: props.track.id })
                }

                if (props.editImported) {
                    await STATE.callPlaylistAction(id).addTrack({ track: "$imported" })
                }

                included.add(id)
            }
        }

        return () => (
            <Overlay variant="clear" class="flex column" show={loading.value}>{{
                overlay: () => <LoadingIndicator />,
                default: () => <>
                    <h3 class="m-0 mb-2">Save into...</h3>
                    <div class="flex flex-fill column">
                        {[...STATE.playlists.playlists.values()].map(playlist => playlist.id != ROOT_PLAYLIST_ID && (
                            <Button onClick={() => togglePlaylist(playlist.id)} class="text-left" key={playlist.id} clear>
                                <Icon icon={included.has(playlist.id) ? mdiCheckboxMarkedOutline : mdiCheckboxBlankOutline} />
                                {" "}
                                {playlist.label}
                            </Button>
                        ))}
                    </div>
                    <Button class="text-left" key="$new-playlist" onClick={newPlaylist} clear> <Icon icon={mdiPlus} /> New playlist </Button>
                </>
            }}</Overlay>
        )
    }
}))