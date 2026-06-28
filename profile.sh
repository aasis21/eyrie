# cortex shell profile (bash)
# Defines the `cortex` command: cd into the control center and launch Copilot CLI.
# Source from ~/.bashrc:  source "$HOME/cortex/profile.sh"
cortex() {
    cd "$HOME/cortex" && copilot --allow-all --mcp-config "mcp/mcp-config.json" "$@"
}
