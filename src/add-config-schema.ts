import fs from "fs/promises";
import os from "os";
import path from "path";

const isWindows = os.platform() === "win32";

const isInsideNodeModules = (location: string) => {
  const parentDir = path.dirname(location);
  return parentDir.endsWith("node_modules");
};

export const findProjectRoot = async () => {
  let location = path.resolve(__dirname, "../..");

  let i = 0;
  while (true) {
    i++;
    if ((isWindows && location.length < 4) || location.length < 2 || i >= 100) {
      throw new Error("Project root directory not found!");
    }

    if (!isInsideNodeModules(location)) {
      const files = await fs.readdir(location);

      if (files.some((f) => f === "package.json")) return location;
    }

    location = path.resolve(location, "..");
  }
};

export const CONFIG_FILE_NAME = "react-gtk.config.json";

export const addConfigSchema = async () => {
  const cwd = await findProjectRoot();

  const vscodeDir = path.resolve(cwd, ".vscode");
  const vscodeSettingsFile = path.resolve(vscodeDir, "settings.json");
  await fs.mkdir(vscodeDir, { recursive: true });

  let settings: { "json.schemas"?: { fileMatch?: unknown; url: string }[] } =
    {};

  const vscodeFiles = await fs.readdir(vscodeDir);
  if (vscodeFiles.includes("settings.json")) {
    const f = await fs.readFile(vscodeSettingsFile, { encoding: "utf-8" });
    settings = JSON.parse(f);
  }

  if (!settings["json.schemas"]) {
    settings["json.schemas"] = [];
  }

  if (
    !settings["json.schemas"].some((s) => {
      const isObject = typeof s === "object" && s !== null;
      if (isObject) {
        const fileMatch = s.fileMatch;
        if (Array.isArray(fileMatch)) {
          return fileMatch.includes(CONFIG_FILE_NAME);
        }
        return fileMatch === CONFIG_FILE_NAME;
      }

      return false;
    })
  ) {
    const configPath = path.resolve(__dirname, "../config-schema.json");
    settings["json.schemas"].push({
      fileMatch: [CONFIG_FILE_NAME],
      url: "./" + path.relative(cwd, configPath),
    });

    await fs.writeFile(vscodeSettingsFile, JSON.stringify(settings, null, 2));
  }
};

addConfigSchema();
