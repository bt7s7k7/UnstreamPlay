import { ComponentPublicInstance, defineComponent, ref, watch } from "vue"
import { Track } from "../../common/Track"
import { eventDecorator } from "../../eventDecorator"
import { Button } from "../../vue3gui/Button"

export const TrackListEntry = eventDecorator(defineComponent({
    name: "TrackListEntry",
    props: {
        track: { type: Track, required: true },
        active: { type: Boolean }
    },
    emits: {
        click: () => true
    },
    setup(props, ctx) {
        const button = ref<ComponentPublicInstance>()

        watch(() => props.active, (active) => {
            if (active) button.value?.$el.scrollIntoView()
        })

        return () => (
            <Button onClick={() => ctx.emit("click")} clear={!props.active} variant={props.active ? "primary" : undefined} class="flex row p-1 gap-1 text-left" ref={button}>
                <div class="flex column gap-1">
                    <div>{props.track.label}</div>
                    <small>{props.track.author}</small>
                </div>
            </Button>
        )
    }
}))