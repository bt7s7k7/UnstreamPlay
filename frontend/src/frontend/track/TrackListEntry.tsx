import { defineComponent } from "vue"
import { Track } from "../../common/Track"
import { eventDecorator } from "../../eventDecorator"
import { Button } from "../../vue3gui/Button"

export const TrackListEntry = eventDecorator(defineComponent({
    name: "TrackListEntry",
    props: {
        track: { type: Track, required: true }
    },
    emits: {
        click: () => true
    },
    setup(props, ctx) {
        return () => (
            <Button onClick={() => ctx.emit("click")} clear class="flex row p-1 gap-1 text-left">
                <div class="flex column gap-1">
                    <div>{props.track.label}</div>
                    <small>{props.track.author}</small>
                </div>
            </Button>
        )
    }
}))