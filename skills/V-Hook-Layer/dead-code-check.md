# dead-code-check

Hook: block completion claims when the diff added unused code.

## Trigger
PreCompletion / PreCommit on the working tree.

## Behavior
Runs the project's dead-code scanner (e.g., `knip`, `ts-prune`). If new symbols / files / assets have no callers, blocks with the list and asks for wiring or removal.

## Why
Operationalizes the dead-code-scan completion mandate. Catches the orphan before it lands.
