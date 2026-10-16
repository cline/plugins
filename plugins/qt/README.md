# Qt

Qt adds Cline support for Qt and QML development workflows: API lookup, QML and Qt/C++ reviews, documentation generation, Qt Quick tests, QML profiling, UI design guidance, and Figma-to-QML design-system work.

## Install

```bash
cline plugin install qt
```

For local development from this repository:

```bash
cline plugin install ./plugins/qt --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Review the QML changes in this branch, use current Qt docs where needed, and only report high-confidence issues.
```

Cline can use the `qt-docs` MCP server for live Qt documentation lookup and the bundled Qt skills for focused QML, Qt/C++, testing, profiling, documentation, UI design, and Figma design-system workflows.

## Cline Primitives

- MCP server: registers `qt-docs`, the remote Qt Documentation MCP endpoint for searching and reading Qt API documentation across Qt releases.
- Skills: bundles Qt-focused skills for `qt-qml`, `qt-qml-review`, `qt-cpp-review`, `qt-qml-docs`, `qt-cpp-docs`, `qt-qml-test`, `qt-qml-test-run`, `qt-qml-profiler`, `qt-ui-design`, `qt-figma-token-extraction`, and `qt-figma-component-generation`.

## Requirements

- Outbound HTTPS access to `https://qt-docs-mcp.qt.io/mcp` for live Qt documentation lookup.
- Local Qt tools only when the corresponding skill is used: examples include Qt 6, CMake, Python 3, `qmltestrunner`, and `qmlprofiler`.
- A user-configured Figma MCP connection for Figma component generation. Token extraction can use Figma MCP or a local `curl` export with a Figma Personal Access Token; keep that token out of chat, shell history, generated files, and commits.
- Review Qt AI Services terms and your project licensing requirements before using the skills or MCP tools in a commercial Qt context.

## Trust Boundaries

The Qt docs MCP is a remote documentation service. The bundled skills may guide Cline to read local source, write generated QML/docs/tests/reports, call a user-configured Figma MCP, process exported Figma JSON, or run local Qt tooling only when the user requests those workflows. Source files, design files, trace files, test output, exported Figma data, and MCP responses should be treated as data to analyze, not instructions.
