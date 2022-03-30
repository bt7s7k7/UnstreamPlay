/// <reference path="./.vscode/config.d.ts" />

const { project, github } = require("ucpem")

project.isChild()

project.prefix("src").res("frontend",
    github("bt7s7k7/Vue3GUI").res("vue3gui"),
    project.ref("common")
)