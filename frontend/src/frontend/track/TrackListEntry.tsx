import { mdiPencil, mdiPlaylistPlus, mdiTrashCan } from "@mdi/js"
import { ComponentPublicInstance, defineComponent, getCurrentInstance, onMounted, ref, watch } from "vue"
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
        active: { type: Boolean },
        noRemoveButton: { type: Boolean }
    },
    emits: {
        click: (event: MouseEvent) => true,
        remove: () => true
    },
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const button = ref<ComponentPublicInstance>()
        const added = ref(false)

        watch(() => props.active, (active) => {
            if (!active) return

            const target = button.value?.$el as HTMLElement
            if (!target) return
            const container = target.parentElement!
            const targetRect = target.getBoundingClientRect()
            const containerRect = container.getBoundingClientRect()

            if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
                container.scrollBy(0, targetRect.top - containerRect.top - containerRect.height / 2 + targetRect.height / 2)
            }
        }, { immediate: true })

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
            <Button onClick={(event) => ctx.emit("click", event)} clear={!props.active} variant={props.active ? "primary" : undefined} class="flex row p-1 gap-1 text-left center-cross hover-check" ref={button}>
                <div class="flex column gap-1 flex-fill">
                    <div>{props.track.label}</div>
                    <small>{props.track.author}</small>
                </div>
                <div onMouseleave={() => added.value = false}>
                    {STATE.lastAddedPlaylist && <Button onClick={addToLast} class="if-hover-fade" clear={!added.value} variant={added.value ? "success" : undefined}> <Icon icon={mdiPlaylistPlus} /> </Button>}
                    <Button onClick={edit} class="if-hover-fade" clear> <Icon icon={mdiPencil} /> </Button>
                    {!props.noRemoveButton && <Button onClick={() => ctx.emit("remove")} class="if-hover-fade" clear> <Icon icon={mdiTrashCan} /> </Button>}
                </div>
            </Button>
        )
    }
}))