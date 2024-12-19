import { existsSync } from "fs";
import path from "path";
import rimraf from "rimraf";
import { html, Output } from "termx-markup";
import { startAppPlugin } from "../esbuild-plugins/start-app/start-app-plugin";
import { AppResources } from "../utils/app-resources";
import { Command } from "../utils/command";
import { getEntrypoint } from "../utils/get-entrypoint";
import type { AdditionalPlugins } from "../utils/get-plugins";
import { getPlugins } from "../utils/get-plugins";
import { BuildProgram } from "./build-program";
import { createBuildOptions } from "./default-build-options";

export class StartProgram extends BuildProgram {
  readonly type = "start";

  protected getBuildDirPath() {
    return path.resolve(this.cwd, this.config.outDir, ".build");
  }

  additionalPlugins(): AdditionalPlugins {
    return {
      before: [
        startAppPlugin({
          getCwd: () => this.getBuildDirPath(),
          beforeStart: this.beforeStart.bind(this),
          program: this,
        }),
      ],
    };
  }

  protected async beforeStart() {
    const appName = this.appName;
    const buildDirPath = this.getBuildDirPath();

    await this.prepareBuildFiles(appName, buildDirPath);

    if (this.config.beforeBuild) {
      await this.config.beforeBuild(buildDirPath);
    }

    await new Command("meson", ["setup", "_build"], {
      cwd: buildDirPath,
    }).run();
  }

  /**
   * @internal
   */
  async main() {
    if (this.watchMode) {
      Output.print(html`
        <span color="lightBlue"> Starting in watch mode... </span>
      `);
    } else {
      Output.print(html` <span color="lightBlue"> Starting. </span> `);
    }

    const buildDirPath = this.getBuildDirPath();

    this.resources = new AppResources(this.appID);

    if (existsSync(buildDirPath)) await rimraf(buildDirPath, {});

    await this.esbuildCtx.init(
      createBuildOptions(this, {
        stdin: {
          contents: getEntrypoint(this),
          loader: "js",
          resolveDir: this.cwd,
        },
        outfile: path.resolve(buildDirPath, "src", "main.js"),
        plugins: getPlugins(this),
        minify: this.config.minify ?? (this.isDev ? false : true),
        treeShaking: this.config.treeShake ?? (this.isDev ? false : true),
      }),
      this.watchMode,
    );

    await this.esbuildCtx.start();

    Output.print(html` <span color="lightGreen"> Build completed. </span> `);
  }
}
