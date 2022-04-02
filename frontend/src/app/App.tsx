import { defineComponent } from "vue"
import { STATE } from "../frontend/State"
import "../frontend/style.scss"
import { DynamicsEmitter } from "../vue3gui/DynamicsEmitter"
import { LoadingIndicator } from "../vue3gui/LoadingIndicator"

export const App = defineComponent({
    name: "App",
    setup(props, ctx) {
        return () => (
            <DynamicsEmitter>
                {STATE.ready ? (
                    <router-view />
                ) : (
                    <div class="flex-fill flex center">
                        <LoadingIndicator />
                    </div>
                )}
            </DynamicsEmitter>
        )
    }
})