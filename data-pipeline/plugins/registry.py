import os
import json
import glob

PLUGIN_DIR = os.path.dirname(__file__)

def get_all_plugins():
    """Discover all plugins by reading config.json in subdirectories."""
    plugins = []
    # Search for config.json files in subdirectories of the plugins dir
    config_files = glob.glob(os.path.join(PLUGIN_DIR, "*", "config.json"))
    
    for config_file in config_files:
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
                config['plugin_path'] = os.path.dirname(config_file)
                plugins.append(config)
        except Exception as e:
            print(f"Error loading plugin config {config_file}: {e}")
            
    return plugins

def get_parser_for_file(filename):
    """Return the plugin config that matches the filename."""
    plugins = get_all_plugins()
    for plugin in plugins:
        # Simple wildcard matching for filePattern
        # (A real implementation might use fnmatch or re)
        patterns = plugin.get('filePattern', [])
        for pattern in patterns:
            # basic wildcard check: 'R*.nc'
            if pattern.startswith('*') and filename.endswith(pattern[1:]):
                return plugin
            elif pattern.endswith('*') and filename.startswith(pattern[:-1]):
                return plugin
            elif pattern.replace('*', '') in filename:
                return plugin
                
    return None
    
if __name__ == "__main__":
    print(json.dumps(get_all_plugins(), indent=2))
