import { mdiPencil, mdiPlaylistPlus, mdiTrashCan } from "@mdi/js"
import { ComponentPublicInstance, defineComponent, ref, watch } from "vue"
import { Track } from "../../common/Track"
import { eventDecorator } from "../../eventDecorator"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { STATE } from "../State"
import { TrackView } from "./TrackView"

export const TrackListEntry = eventDecorator(defineComponent({
    name: "TrackListEntry",
    props: {
        track: { type: Track, required: true },
        active: { type: Boolean }
    },
    emits: {
        click: () => true,
        remove: () => true
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const button = ref<ComponentPublicInstance>()
        const added = ref(false)

        watch(() => props.active, (active) => {
            if (active) button.value?.$el.scrollIntoView()
        })

        function edit() {
            emitter.modal(TrackView, {
                contentProps: { track: props.track },
                props: {
                    cancelButton: "Close",
                    class: "w-500 h-700"
                }
            })
        }

        async function addToLast() {
            if (!STATE.lastAddedPlaylist) return
            await STATE.callPlaylistAction(STATE.lastAddedPlaylist).addTrack({ track: props.track.id })
            added.value = true
        }

        return () => (
            <Button onClick={() => ctx.emit("click")} clear={!props.active} variant={props.active ? "primary" : undefined} class="flex row p-1 gap-1 text-left center-cross hover-check" ref={button}>
                <div class="flex column gap-1 flex-fill">
                    <div>{props.track.label}</div>
                    <small>{props.track.author}</small>
                </div>
                <div onMouseleave={() => added.value = false}>
                    {STATE.lastAddedPlaylist && <Button onClick={addToLast} class="if-hover-fade" clear={!added.value} variant={added.value ? "success" : undefined}> <Icon icon={mdiPlaylistPlus} /> </Button>}
                    <Button onClick={edit} class="if-hover-fade" clear> <Icon icon={mdiPencil} /> </Button>
                    <Button onClick={() => ctx.emit("remove")} class="if-hover-fade" clear> <Icon icon={mdiTrashCan} /> </Button>
                </div>
            </Button>
        )
    }
}))