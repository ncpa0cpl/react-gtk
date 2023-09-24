import path from "path";

export const evalJsConfigFile = async (
  config: string,
): Promise<() => unknown> => {
  const ext = path.extname(config);
  if (ext === ".cjs" || ext === ".cts" || ext === ".ts") {
    throw new Error(
      `Invalid config file type: '${ext}'. react-gnome is running in ESModule mode and can accept only configs in ESModule format. To use CommonJS, set the 'type' field in your package.json to 'commonjs'.`,
    );
  }

  const defaultExport = await import(config);

  if (typeof defaultExport.default === "function") {
    return defaultExport.default;
  }

  throw new Error(
    `The default export of the config file must be a function, but it was a ${typeof defaultExport.default}`,
  );
};
