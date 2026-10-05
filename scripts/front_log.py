"""JSON-line logger for the front-page tools: the observability law in one small module.

Shared by scripts/build_front_page.py, scripts/front_carry.py and scripts/front_check.py. The
Node probe writes the same five keys, so one file can be read with one filter.

    from front_log import get_logger, EXIT_OK, EXIT_RED, EXIT_COULD_NOT_LOOK
    log = get_logger("build_front_page")     # prints the log path as the FIRST line of the run
    log.info("screen_built", screen="home", bytes=8722)
    log.warn("figure_unavailable", figure="guards", reason="the suite was not executed")
    log.finish("ok")                         # the explicit last line of the run

One line per event, five keys: ts, level + severity_number, run_id, event, ctx. The tool name rides
in ctx, because the three tools share one file per day: scripts/logs/front-page-YYYYMMDD.jsonl
(gitignored). Where each piece comes from (AI-Brain/instructions/observability-law.md):

  * severity_number is the OpenTelemetry number, so "everything erroneous" is one filter: >= 17.
  * run_id is one uuid4 hex for the process, bound into every line, so two runs that share a
    day's file stay separable.
  * faulthandler writes a hard fault (a segfault, a stack overflow) into the same file, and
    sys.excepthook logs the traceback of anything uncaught. Both end the run with a final line,
    so a log with no final line is itself the evidence of a hard kill.
  * A tool that exits without calling finish() still gets a final line, from atexit.
  * Log what did NOT happen: screen_skipped, tier_page_missing, carry_literal_unmapped,
    figure_unavailable. A silent gap is worse than a noisy log.
  * Exit codes are the Doctor's: 0 green, 1 red, 2 could-not-look, which is never a pass.

If the log directory cannot be written, get_logger() raises OSError. A tool that cannot leave a
trail must not run, and its caller decides what to do (the builders exit 2).
"""

from __future__ import annotations

import atexit
import faulthandler
import json
import os
import sys
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path

EXIT_OK = 0
EXIT_RED = 1
EXIT_COULD_NOT_LOOK = 2


class CouldNotLook(Exception):
    """An input is missing, unreadable or invalid. The tool exits 2, which is never a pass."""


class Refused(Exception):
    """The inputs were read but the content breaks a rule, so nothing is written. The tool exits 1."""


# OpenTelemetry log data model: TRACE 1-4, DEBUG 5-8, INFO 9-12, WARN 13-16, ERROR 17-20, FATAL 21-24.
# The lowest number of each range is the one every language uses.
SEVERITY = {"TRACE": 1, "DEBUG": 5, "INFO": 9, "WARN": 13, "ERROR": 17, "FATAL": 21}

LOG_DIR = Path(__file__).resolve().parent / "logs"

_RUN_ID = uuid.uuid4().hex          # one per process, bound into every line of the run
_LOGGERS: dict = {}
_STATE = {"fh": None, "path": None, "hooked": False}


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def _short(value, limit=110) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, default=str)
    return text if len(text) <= limit else text[: limit - 3] + "..."


def _make_console_safe() -> None:
    """A cp1252 console raises on the middle dot and the em dash that this site's copy uses."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="backslashreplace")


def _open_file() -> None:
    """Open today's file once per process, print its path first, and arm the crash trap."""
    if _STATE["fh"] is not None:
        return
    _make_console_safe()
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    path = LOG_DIR / ("front-page-%s.jsonl" % datetime.now().strftime("%Y%m%d"))
    fh = open(path, "a", encoding="utf-8", newline="\n")
    _STATE["fh"], _STATE["path"] = fh, path
    # The first line of every run, to stdout, so a manual can say "send me the file at this path".
    print("log: %s" % path, flush=True)
    print("run: %s" % _RUN_ID, flush=True)
    # Hard faults (segfault, stack overflow) land in the same file. Python keeps fh alive for us.
    faulthandler.enable(file=fh)
    _install_excepthook()
    atexit.register(_finish_all, "exited_without_finish")


def _install_excepthook() -> None:
    if _STATE["hooked"]:
        return
    _STATE["hooked"] = True

    def hook(exc_type, exc, tb):
        interrupted = issubclass(exc_type, KeyboardInterrupt)
        for logger in list(_LOGGERS.values()):
            if interrupted:
                logger.warn("interrupted", reason="KeyboardInterrupt")
            else:
                logger.fatal(
                    "crash",
                    error="%s: %s" % (exc_type.__name__, exc),
                    traceback=traceback.format_exception(exc_type, exc, tb),
                )
        _finish_all("interrupted" if interrupted else "crashed")
        sys.__excepthook__(exc_type, exc, tb)      # the person at the console still sees it
        sys.stdout.flush()
        sys.stderr.flush()
        # An uncaught crash means nobody looked: 2, not 1. os._exit because the interpreter would say 1.
        os._exit(130 if interrupted else EXIT_COULD_NOT_LOOK)

    sys.excepthook = hook


def _finish_all(outcome: str) -> None:
    for logger in list(_LOGGERS.values()):
        logger.finish(outcome)


class Logger:
    """One tool's view of the run. Use get_logger(); do not construct this directly."""

    def __init__(self, tool: str, echo: bool = True, bound: dict | None = None, parent: "Logger | None" = None):
        self.tool = tool
        self.echo = echo
        self._bound = dict(bound or {})
        self._parent = parent
        self.finished = False
        self.counts = {"WARN": 0, "ERROR": 0, "FATAL": 0}
        self._t0 = time.monotonic()

    # -- identity ---------------------------------------------------------------------------------

    @property
    def path(self) -> Path:
        return _STATE["path"]

    @property
    def run_id(self) -> str:
        return _RUN_ID

    def bind(self, **ctx) -> "Logger":
        """A child that adds `ctx` to every line it writes (the binder: no hand-passing context)."""
        return Logger(self.tool, echo=self.echo, bound={**self._bound, **ctx}, parent=self._root())

    def _root(self) -> "Logger":
        return self._parent or self

    # -- writing ----------------------------------------------------------------------------------

    def _write(self, level: str, event: str, ctx: dict) -> None:
        root = self._root()
        merged = {"tool": self.tool, **self._bound, **ctx}
        record = {
            "ts": _now_iso(),
            "level": level,
            "severity_number": SEVERITY[level],
            "run_id": _RUN_ID,
            "event": event,
            "ctx": merged,
        }
        line = json.dumps(record, ensure_ascii=False, default=str) + "\n"
        fh = _STATE["fh"]
        fh.write(line)                      # one write per line, so shared appends do not interleave
        fh.flush()
        if level in root.counts:
            root.counts[level] += 1
        if self.echo:
            self._echo(level, event, merged)

    def _echo(self, level: str, event: str, ctx: dict) -> None:
        shown = " ".join("%s=%s" % (k, _short(v)) for k, v in ctx.items() if k not in ("tool", "traceback"))
        text = "%s %-5s %s %s" % (datetime.now().strftime("%H:%M:%S"), level, event, shown)
        print(text.rstrip(), file=sys.stderr if SEVERITY[level] >= SEVERITY["ERROR"] else sys.stdout, flush=True)

    def debug(self, event: str, **ctx) -> None:
        self._write("DEBUG", event, ctx)

    def info(self, event: str, **ctx) -> None:
        self._write("INFO", event, ctx)

    def warn(self, event: str, **ctx) -> None:
        self._write("WARN", event, ctx)

    def error(self, event: str, **ctx) -> None:
        self._write("ERROR", event, ctx)

    def fatal(self, event: str, **ctx) -> None:
        self._write("FATAL", event, ctx)

    def finish(self, outcome: str) -> None:
        """The explicit final line of this tool's run. Safe to call twice; the second call is ignored.

        Only the logger from get_logger() can end the run. A bound child (what a carry step receives)
        must not, or the run would be over before the tool had finished."""
        root = self._root()
        if self._parent is not None:
            self.debug("child_finish_ignored", outcome=outcome)
            return
        if root.finished:
            return
        root.finished = True
        level = "INFO" if outcome in ("ok", "green", "check_clean") else "WARN"
        root._write(
            level,
            "run_end",
            {
                "outcome": outcome,
                "warnings": root.counts["WARN"],
                "errors": root.counts["ERROR"] + root.counts["FATAL"],
                "seconds": round(time.monotonic() - root._t0, 2),
            },
        )


def get_logger(tool: str, echo: bool = True) -> Logger:
    """The logger for `tool`. First call in a process opens the file and prints its path."""
    _open_file()
    if tool not in _LOGGERS:
        _LOGGERS[tool] = Logger(tool, echo=echo)
        _LOGGERS[tool].info(
            "run_start",
            argv=sys.argv[1:],
            python=sys.version.split()[0],
            cwd=str(Path.cwd()),
            log_path=str(_STATE["path"]),
        )
    return _LOGGERS[tool]
