# Eyrie launcher for bash and zsh. Source from your shell rc file (scripts/install-shell.mjs
# adds the block). Defines a function named $EYRIE_COMMAND (default: eyrie):
#   <cmd> [copilot args...]   start Copilot CLI in the HQ
#   <cmd> enable <alias>      load Eyrie in that project's repository sessions
#   <cmd> disable <alias>     stop loading Eyrie there

if [ -z "${EYRIE_HOME:-}" ]; then
    if [ -n "${BASH_SOURCE:-}" ]; then
        EYRIE_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    elif [ -n "${ZSH_VERSION:-}" ]; then
        EYRIE_HOME="$(cd "$(dirname "${(%):-%x}")" && pwd)"
    fi
    export EYRIE_HOME
fi

_eyrie_run() {
    if [ "$1" = "enable" ] || [ "$1" = "disable" ]; then
        if [ "$#" -ne 2 ]; then
            echo "Usage: ${EYRIE_COMMAND:-eyrie} $1 <alias>" >&2
            return 2
        fi
        node "$EYRIE_HOME/scripts/repo-mode.mjs" "$1" "$2" --home "$EYRIE_HOME"
        return
    fi
    cd "$EYRIE_HOME" || return
    if [ -f "$EYRIE_HOME/mcp-config.json" ]; then
        copilot --additional-mcp-config "@$EYRIE_HOME/mcp-config.json" "$@"
    else
        copilot "$@"
    fi
}

case "${EYRIE_COMMAND:-eyrie}" in
    [A-Za-z_]*[!A-Za-z0-9_-]* | [!A-Za-z_]*)
        echo "EYRIE_COMMAND '${EYRIE_COMMAND}' is not a valid function name; using 'eyrie'." >&2
        eval 'eyrie() { _eyrie_run "$@"; }'
        ;;
    *)
        eval "${EYRIE_COMMAND:-eyrie}() { _eyrie_run \"\$@\"; }"
        ;;
esac
