class PluginRegistryClass {
  constructor() {
    this.plugins = new Map();
  }

  register(id, pluginFactory) {
    this.plugins.set(id, pluginFactory);
  }

  create(id, context, config) {
    const factory = this.plugins.get(id);
    if (!factory) {
      throw new Error(`Plugin id ${id} is not registered.`);
    }
    const plugin = Object.create(factory);
    plugin.init(context, config);
    return plugin;
  }
}

export const PluginRegistry = new PluginRegistryClass();
