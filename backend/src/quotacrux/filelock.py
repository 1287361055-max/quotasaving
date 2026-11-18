"""Advisory exclusive file locks that work on both POSIX and Windows.

POSIX uses ``fcntl.flock``; Windows has no ``fcntl``, so it falls back to
``msvcrt.locking`` on a one-byte range at the start of the file. Both variants
are non-blocking and raise ``BlockingIOError`` when the lock is already held.
"""

from __future__ import annotations

import sys

if sys.platform == "win32":
    import msvcrt
else:
    import fcntl

_WINDOWS = sys.platform == "win32"


def acquire(fd) -> None:
    """Take an exclusive non-blocking lock on an open file object."""
    if _WINDOWS:
        fd.seek(0)
        try:
            msvcrt.locking(fd.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError:
            raise BlockingIOError("lock is held by another process") from None
    else:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)


def release(fd) -> None:
    """Release a lock previously taken with :func:`acquire`."""
    if _WINDOWS:
        fd.seek(0)
        msvcrt.locking(fd.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        fcntl.flock(fd, fcntl.LOCK_UN)
