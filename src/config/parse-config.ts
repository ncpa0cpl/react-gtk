import { assertDataType } from "dilswer";
import fs from "fs/promises";
import path from "path";
import { ConfigSchema } from "./config-schema";
import { evalJsConfigFile } from "./eval-js-config/eval-js-config";

export type ConfigContext = {
  mode: "production" | "development";
};

async function parseJsonConfig(filePath: string) {
  const fileData = await fs.readFile(filePath, "utf-8");
  const config = JSON.parse(fileData);

  assertDataType(ConfigSchema, config);

  return config;
}

async function parseJsConfig(filePath: string, context: ConfigContext) {
  const getConfig = await evalJsConfigFile(filePath);
  const config = getConfig(context);

  assertDataType(ConfigSchema, config);

  return config;
}

export function parseConfig(filePath: string, context: ConfigContext) {
  const p = path.parse(filePath);

  if (p.ext === ".json") {
    return parseJsonConfig(filePath);
  } else if ([".ts", ".cts", ".mts"].includes(p.ext)) {
    // @ts-expect-error
    if (process[Symbol.for("ts-node.register.instance")] == null) {
      throw new Error(
        "Invalid config file: To use TypeScript for the config file ts-node package must be installed.",
      );
    }
    return parseJsConfig(filePath, context);
  } else if ([".js", ".cjs", ".mjs"].includes(p.ext)) {
    return parseJsConfig(filePath, context);
  } else {
    throw new Error(`Unsupported config file type: '${p.ext}'.`);
  }
}
