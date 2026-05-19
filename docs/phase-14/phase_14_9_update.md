# Manifest Editor

- Each line should be selectable. Double click to open the selected file's editor.
- Line position should be changable via drag-and-drop.
- Line should have a delete button on it (right-side edge).
- There should be dropdown at the bottom for selecting and adding a file.
- Save button doesn't belong in this editor.
- Project name should also be editable.
- Stylistically, editor-tools should be unified, using the same theme, atoms, and molecules. This is what we have a ui lib for.

# Project

We must have project-scope undo/redo/save in devtools top bar. Save commits all changes in vfs and saves project to filesystem (if possible, this shouldn't crash).

We must have a standard toasts system, and it should show reports on actions (save succeeded, file moved, etc).

# Project Explorer

We must report actions in a toasts system.
Style must be system standard. Selection is not very visible right now.

# Editors

cave_roguelite_gdd_v2 is the standard project structure with standard project files. None of their editors load properly. Fix this. Add tests to see that each editor type renders correctly for each type of file.
