import { h } from "vue"
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router"
import { useTitle } from "../frontend/useTitle"

const routes: RouteRecordRaw[] = [
    {
        name: "404",
        component: { setup: () => (useTitle("Not found"), () => h("pre", { class: "m-4" }, "Page not found")) },
        path: "/:page(.*)*"
    }
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})