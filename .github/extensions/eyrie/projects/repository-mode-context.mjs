export function formatRepositoryStartup({ primary, eyrieHome }) {
    return [
        "# Eyrie",
        `Primary checkout: ${primary.path}. Follow its local instructions.`,
        "",
        'Use eyrie_search or eyrie_peek to find workflows; project="eyrie" selects shared',
        "HQ skills. Read selected files in full.",
        "",
        "Tools also support project activation, independent-session messaging,",
        "and approved remote agents. Command: /eyrie.",
        "",
        `Eyrie HQ: ${eyrieHome}`,
    ].join("\n");
}

export function formatRepositoryReminder({ aliases }) {
    return [
        "Eyrie: follow local instructions. Discover workflows with eyrie_search or eyrie_peek.",
        ...(aliases.length ? [`Additional scope: ${aliases.join(", ")}.`] : []),
    ].join("\n");
}

export function formatRepositoryActivation({ project, primary }) {
    return [
        project.alias === primary.alias
            ? `Eyrie primary project: ${project.alias}`
            : `Eyrie scope added: ${project.alias}`,
        `Path: ${project.path}`,
        `Primary checkout: ${primary.path}`,
        "",
        `Discover guidance with eyrie_search(project="${project.alias}", query="<keywords>")`,
        `or eyrie_peek(project="${project.alias}").`,
    ].join("\n");
}
