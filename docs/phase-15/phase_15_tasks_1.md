- game.init is a stupid command, and needs to be removed.
  Same for game.default_start.
  Same for game.new.
  Same for open.
  Same for echo.
  Same for touch.

- we need a game.reset command. It must reset current game data completely - the runtime needs to be destroyed, the ecs cleared out, etc.

- we need a start.cvs script in example project, which will
  call game.reset
  open the correct project
  create the attribute pools
  create the face nodes
  spawn newbody
  start ticker

- physics component needs to be always created from worldPresence ability (if the ability is defined) when compiling.

- fix undo/redo not always being connected to changes - it looks like undo/redo works from the moment I load the window until I call project-load.

- when I reload the page after having had a project open when I closed the page, the project must be open.
