import subprocess
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger("zentronyx.process.executor")


class ProcessExecutionResult:
    def __init__(
        self,
        exit_code: int,
        stdout: str,
        stderr: str,
        timed_out: bool = False,
        execution_time_ms: int = 0
    ):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.timed_out = timed_out
        self.execution_time_ms = execution_time_ms


class ProcessExecutor:
    """
    Safe Process Execution Abstraction.
    Strictly forbids shell=True for user inputs and executes command vectors directly.
    """

    @staticmethod
    def run_command(
        cmd: List[str],
        cwd: Optional[str] = None,
        timeout_seconds: int = 60,
        env: Optional[Dict[str, str]] = None
    ) -> ProcessExecutionResult:
        if not cmd or not isinstance(cmd, list):
            raise ValueError("Command vector must be a non-empty list of strings.")

        # Resolve binary path using shutil.which and virtualenv Scripts directory fallback
        import shutil
        import sys
        from pathlib import Path

        bin_name = cmd[0]
        resolved_bin = shutil.which(bin_name)
        if not resolved_bin:
            venv_dir = Path(sys.executable).parent
            candidate_exe = venv_dir / f"{bin_name}.exe"
            candidate_raw = venv_dir / bin_name
            if candidate_exe.exists():
                resolved_bin = str(candidate_exe)
            elif candidate_raw.exists():
                resolved_bin = str(candidate_raw)

        executed_cmd = list(cmd)
        if resolved_bin:
            executed_cmd[0] = resolved_bin

        logger.info(f"Executing Process Vector: {' '.join(executed_cmd)} (Timeout: {timeout_seconds}s)")

        try:
            res = subprocess.run(
                executed_cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                shell=False,  # Strict command vector execution
                env=env
            )
            return ProcessExecutionResult(
                exit_code=res.returncode,
                stdout=res.stdout or "",
                stderr=res.stderr or "",
                timed_out=False
            )
        except subprocess.TimeoutExpired as te:
            logger.warning(f"Process execution timed out after {timeout_seconds}s: {cmd[0]}")
            return ProcessExecutionResult(
                exit_code=-1,
                stdout=te.stdout or "" if isinstance(te.stdout, str) else "",
                stderr=te.stderr or "" if isinstance(te.stderr, str) else "Process timed out.",
                timed_out=True
            )
        except Exception as e:
            logger.error(f"Process execution failed: {str(e)}")
            return ProcessExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=str(e),
                timed_out=False
            )
